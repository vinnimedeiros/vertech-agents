import { RequestContext } from "@mastra/core/request-context";
import {
	agent as agentTable,
	contact as contactTable,
	conversation as conversationTable,
	db,
	eq,
	message as messageTable,
} from "@repo/database";
import { getMastra } from "../instance";
import { getLogger } from "../logger";

const log = getLogger("runtime/invoker");

/**
 * Runtime invoker — ponto de entrada quando uma mensagem inbound precisa ser
 * processada pelo agente comercial.
 *
 * Chamado pelo worker BullMQ (packages/queue/src/workers/agent-invocation.ts)
 * quando um job e puxado da fila.
 *
 * Responsabilidade desta funcao:
 * 1. Buscar contexto (message + conversation + contact + agent)
 * 2. Aplicar guards (SENT, IA desabilitada, agent nao ACTIVE)
 * 3. Marcar message PROCESSING
 * 4. Invocar commercialAgent.generate() via Mastra
 * 5. Persistir outbound message como PENDING
 * 6. Retornar dados pro worker fazer envio externo (WhatsApp)
 *
 * NAO e responsabilidade: enviar via WhatsApp. Isso fica pro worker
 * pra evitar ciclo de dependencia (@repo/whatsapp importa @repo/queue
 * que importa @repo/ai — se @repo/ai importasse @repo/whatsapp, ciclo).
 */

export type InvokeAgentForMessageInput = {
	messageId: string;
};

/**
 * Resultado pro worker orquestrar envio externo.
 * `null` = nada a enviar (guards abortaram, sem canal, etc)
 */
export type InvokeAgentResult = {
	outboundMessageId: string;
	channel: "WHATSAPP" | "EMAIL" | "SMS" | "WEBCHAT" | "INTERNAL";
	channelInstanceId: string | null;
	phone: string | null;
	text: string;
} | null;

export async function invokeAgentForMessage(
	input: InvokeAgentForMessageInput,
): Promise<InvokeAgentResult> {
	const { messageId } = input;

	const inbound = await db.query.message.findFirst({
		where: eq(messageTable.id, messageId),
	});
	if (!inbound) {
		log.warn({ messageId }, "invokeAgent abort — message não existe");
		return null;
	}

	// Idempotencia — se o fluxo ja completou, nao reprocessa
	if (inbound.status === "SENT" || inbound.status === "DELIVERED") {
		return null;
	}

	const conversation = await db.query.conversation.findFirst({
		where: eq(conversationTable.id, inbound.conversationId),
	});
	if (!conversation) {
		log.warn({ conversationId: inbound.conversationId }, "invokeAgent abort — conversation não existe");
		return null;
	}

	if (!conversation.isAIEnabled || !conversation.assignedAgentId) {
		return null;
	}

	const agent = await db.query.agent.findFirst({
		where: eq(agentTable.id, conversation.assignedAgentId),
	});
	if (!agent || agent.status !== "ACTIVE") {
		return null;
	}

	const contact = await db.query.contact.findFirst({
		where: eq(contactTable.id, conversation.contactId),
	});
	if (!contact) {
		log.warn({ contactId: conversation.contactId }, "invokeAgent abort — contact não existe");
		return null;
	}

	// MVP: texto only. Multimodal em Phase 08+.
	if (!inbound.text || !inbound.text.trim()) {
		return null;
	}

	// Marca PROCESSING
	await db
		.update(messageTable)
		.set({ status: "PROCESSING" })
		.where(eq(messageTable.id, messageId));

	const mastra = getMastra();
	const commercial = mastra.getAgent("commercialAgent");

	const requestContext = new RequestContext<Record<string, unknown>>([
		["agentId", agent.id],
		["organizationId", conversation.organizationId],
		["conversationId", conversation.id],
		["contactId", conversation.contactId],
		["whatsappInstanceId", conversation.channelInstanceId ?? null],
	]);

	const startMs = Date.now();
	let responseText = "";
	let responseUsage: unknown = null;
	let responseToolCalls: unknown[] = [];
	let responseStepsCount = 0;

	try {
		const result = await commercial.generate(inbound.text, {
			maxSteps: agent.maxSteps ?? 10,
			requestContext,
			memory: {
				resource: `ws-${conversation.organizationId}:contact-${conversation.contactId}`,
				thread: `conv-${conversation.id}`,
			},
		});

		const resultAny = result as unknown as {
			text?: string;
			usage?: unknown;
			toolCalls?: unknown[];
			steps?: unknown[];
		};

		responseText = resultAny.text ?? "";
		responseUsage = resultAny.usage ?? null;
		responseToolCalls = resultAny.toolCalls ?? [];
		responseStepsCount = resultAny.steps?.length ?? 0;
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : String(err);
		log.error({ err, errorMsg, messageId }, "invokeAgent generate falhou");
		await db
			.update(messageTable)
			.set({
				status: "FAILED",
				metadata: { error: errorMsg, durationMs: Date.now() - startMs },
			})
			.where(eq(messageTable.id, messageId));
		throw err; // propaga pro worker aplicar retry policy
	}

	if (!responseText.trim()) {
		log.warn({ messageId }, "invokeAgent resposta vazia do agente");
		await db
			.update(messageTable)
			.set({
				status: "FAILED",
				metadata: {
					error: "empty_response",
					durationMs: Date.now() - startMs,
				},
			})
			.where(eq(messageTable.id, messageId));
		return null;
	}

	const durationMs = Date.now() - startMs;

	// Insert outbound message (PENDING — sera atualizada pelo worker pos envio)
	const [outbound] = await db
		.insert(messageTable)
		.values({
			conversationId: conversation.id,
			senderType: "AGENT",
			senderId: agent.id,
			senderName: agent.name,
			senderAvatar: agent.avatarUrl,
			direction: "OUTBOUND",
			type: "TEXT",
			status: "PENDING",
			text: responseText,
			metadata: {
				modelUsed: agent.model,
				durationMs,
				usage: responseUsage,
				toolCalls: responseToolCalls,
				steps: responseStepsCount,
				inboundMessageId: messageId,
			},
		})
		.returning({ id: messageTable.id });

	// Atualiza conversation com preview + lastMessageAt
	await db
		.update(conversationTable)
		.set({
			lastMessageAt: new Date(),
			lastMessagePreview: responseText.slice(0, 80),
		})
		.where(eq(conversationTable.id, conversation.id));

	// Marca inbound SENT (fluxo invoker completou)
	await db
		.update(messageTable)
		.set({
			status: "SENT",
			metadata: {
				processedAt: new Date().toISOString(),
				durationMs,
				outboundMessageId: outbound.id,
			},
		})
		.where(eq(messageTable.id, messageId));

	return {
		outboundMessageId: outbound.id,
		channel: conversation.channel,
		channelInstanceId: conversation.channelInstanceId,
		phone: contact.phone,
		text: responseText,
	};
}
