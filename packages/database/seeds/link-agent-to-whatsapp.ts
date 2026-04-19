/**
 * Vincula um agente a uma instancia WhatsApp existente.
 *
 * Uso:
 *   pnpm --filter @repo/database exec tsx seeds/link-agent-to-whatsapp.ts <agentId> <whatsappInstanceId>
 */
import { agent, db, eq } from "../drizzle";

async function main() {
	const [, , agentId, instanceId] = process.argv;

	if (!agentId || !instanceId) {
		console.error("Uso: tsx link-agent-to-whatsapp.ts <agentId> <instanceId>");
		process.exit(1);
	}

	const result = await db
		.update(agent)
		.set({ whatsappInstanceId: instanceId, updatedAt: new Date() })
		.where(eq(agent.id, agentId))
		.returning({ id: agent.id, name: agent.name });

	if (result.length === 0) {
		console.error(`[link] agent ${agentId} nao encontrado`);
		process.exit(1);
	}

	console.log(
		`[link] ✅ ${result[0].name} vinculado a instance ${instanceId}`,
	);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("[link] falhou:", err);
		process.exit(1);
	});
