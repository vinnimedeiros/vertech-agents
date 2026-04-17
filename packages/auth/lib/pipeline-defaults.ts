import { and, db, eq, pipeline, pipelineStage } from "@repo/database";

/**
 * Stages default criados ao bootstrapar um Client workspace.
 * Ordem reflete o funil comercial típico.
 */
const DEFAULT_STAGES = [
	{ name: "Novo lead", color: "#94a3b8", position: 0 },
	{ name: "Em andamento", color: "#3b82f6", position: 1 },
	{ name: "Proposta", color: "#8b5cf6", position: 2 },
	{ name: "Negociação", color: "#f59e0b", position: 3 },
	{
		name: "Fechado ganho",
		color: "#22c55e",
		position: 4,
		isClosing: true,
		isWon: true,
	},
	{
		name: "Fechado perdido",
		color: "#ef4444",
		position: 5,
		isClosing: true,
		isWon: false,
	},
] as const;

/**
 * Cria pipeline default + stages padrão para um Client recém-criado.
 * Idempotente: se a org já tiver pipeline, não faz nada.
 */
export async function ensureDefaultPipeline(organizationId: string) {
	const [existing] = await db
		.select({ id: pipeline.id })
		.from(pipeline)
		.where(
			and(
				eq(pipeline.organizationId, organizationId),
				eq(pipeline.isDefault, true),
			),
		)
		.limit(1);

	if (existing) {
		return existing.id;
	}

	const now = new Date();

	const [newPipeline] = await db
		.insert(pipeline)
		.values({
			organizationId,
			name: "Pipeline principal",
			isDefault: true,
			position: 0,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	await db.insert(pipelineStage).values(
		DEFAULT_STAGES.map((stage) => ({
			pipelineId: newPipeline.id,
			name: stage.name,
			color: stage.color,
			position: stage.position,
			isClosing: "isClosing" in stage ? stage.isClosing : false,
			isWon: "isWon" in stage ? stage.isWon : false,
			createdAt: now,
		})),
	);

	return newPipeline.id;
}
