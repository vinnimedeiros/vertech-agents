import { Agent } from "@mastra/core/agent";
import { agent as agentTable, db, eq } from "@repo/database";
import { buildInstructions } from "../instructions/builder";
import { getCommercialAgentMemory } from "../memory/config";
import { commercialTools } from "../tools/commercial";

/**
 * Agente comercial dinamico — UMA instancia que le config do banco via
 * `requestContext` pra cada invocacao. Multi-tenant por design.
 *
 * `requestContext` e populado pelo runtime invoker (07A.6) com:
 * - agentId: string
 * - organizationId: string
 * - conversationId: string
 * - contactId: string
 * - whatsappInstanceId: string | null
 */
export const commercialAgent = new Agent({
	id: "commercial-agent",
	name: "Commercial Agent",
	description: "Agente comercial dinamico multi-tenant da Vertech",

	model: async ({ requestContext }) => {
		const record = await loadAgentFromContext(requestContext);
		return record.model as never;
	},

	instructions: async ({ requestContext }) => {
		const record = await loadAgentFromContext(requestContext);
		return buildInstructions(record);
	},

	tools: async ({ requestContext }) => {
		const record = await loadAgentFromContext(requestContext);
		return filterTools(record.enabledTools);
	},

	memory: getCommercialAgentMemory(),
});

type RequestContextLike = {
	get: (key: string) => unknown;
};

/**
 * Carrega a row do agente no banco a partir do agentId no requestContext.
 */
async function loadAgentFromContext(requestContext: RequestContextLike) {
	const agentId = requestContext.get("agentId") as string | undefined;
	if (!agentId) {
		throw new Error("requestContext.agentId e obrigatorio");
	}

	const row = await db.query.agent.findFirst({
		where: eq(agentTable.id, agentId),
	});

	if (!row) {
		throw new Error(`Agent ${agentId} nao encontrado no banco`);
	}

	return row;
}

/**
 * Filtra o registry de tools pelas chaves habilitadas no agente.
 * Em 07A o registry esta vazio — retorna `{}` independente de enabledTools.
 * Phase 08 populara `commercialTools` e esse filtro passara a ter efeito.
 */
function filterTools(enabledKeys: string[]) {
	const registry = commercialTools as Record<string, never>;
	const out: Record<string, never> = {};
	for (const key of enabledKeys) {
		if (key in registry) {
			out[key] = registry[key];
		}
	}
	return out;
}
