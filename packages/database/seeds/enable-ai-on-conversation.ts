/**
 * Liga a IA numa conversa existente apontando pro agente.
 *
 * Uso:
 *   pnpm --filter @repo/database exec tsx seeds/enable-ai-on-conversation.ts <conversationId> <agentId>
 */
import { conversation, db, eq } from "../drizzle";

async function main() {
	const [, , conversationId, agentId] = process.argv;

	if (!conversationId || !agentId) {
		console.error(
			"Uso: tsx enable-ai-on-conversation.ts <conversationId> <agentId>",
		);
		process.exit(1);
	}

	const result = await db
		.update(conversation)
		.set({
			isAIEnabled: true,
			assignedAgentId: agentId,
			updatedAt: new Date(),
		})
		.where(eq(conversation.id, conversationId))
		.returning({ id: conversation.id });

	if (result.length === 0) {
		console.error(`[enable-ai] conversation ${conversationId} nao encontrada`);
		process.exit(1);
	}

	console.log(
		`[enable-ai] ✅ conversation ${conversationId} com IA habilitada (agent ${agentId})`,
	);
	console.log(
		"[enable-ai] mande uma mensagem pelo WhatsApp vinculado pra testar",
	);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("[enable-ai] falhou:", err);
		process.exit(1);
	});
