import {
	and,
	calendar,
	db,
	eq,
	pipeline,
	pipelineStage,
	pipelineView,
} from "@repo/database";

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

/**
 * Cria pipeline_view default (kanban compartilhado) pra um pipeline.
 * Idempotente: se já existe view default no pipeline, retorna id dela.
 *
 * Sem isso, a tela /crm/pipeline abre sem view ativa e bug visual aparece.
 * Aplica a toda org (SUPERADMIN/MASTER/AGENCY/CLIENT) que possua pipeline.
 */
export async function ensureDefaultPipelineView(
	organizationId: string,
	pipelineId: string,
) {
	const [existing] = await db
		.select({ id: pipelineView.id })
		.from(pipelineView)
		.where(
			and(
				eq(pipelineView.pipelineId, pipelineId),
				eq(pipelineView.isDefault, true),
			),
		)
		.limit(1);

	if (existing) {
		return existing.id;
	}

	const now = new Date();

	const [newView] = await db
		.insert(pipelineView)
		.values({
			organizationId,
			pipelineId,
			name: "Kanban",
			viewMode: "kanban",
			sortBy: "none",
			isDefault: true,
			isShared: true,
			position: 0,
			filters: {},
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	return newView.id;
}

/**
 * Cria calendar default "Pessoal" pra uma org. Idempotente.
 * Aplica a QUALQUER org type (regra MUST multi-layer features).
 */
export async function ensureDefaultCalendar(organizationId: string) {
	const [existing] = await db
		.select({ id: calendar.id })
		.from(calendar)
		.where(
			and(
				eq(calendar.organizationId, organizationId),
				eq(calendar.isDefault, true),
			),
		)
		.limit(1);

	if (existing) {
		return existing.id;
	}

	const now = new Date();

	const [newCalendar] = await db
		.insert(calendar)
		.values({
			organizationId,
			name: "Pessoal",
			color: "bg-blue-500",
			type: "personal",
			visible: true,
			isDefault: true,
			position: 0,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	return newCalendar.id;
}

/**
 * Bootstrap completo do kit operacional de uma org.
 * Aplicado em TODO org type (SUPERADMIN/MASTER/AGENCY/CLIENT) conforme
 * regra MUST `feedback_multi_layer_features.md`: "Cada workspace opera
 * comercialmente como Client, independente do tipo".
 */
export async function ensureDefaultOperationalKit(organizationId: string) {
	const pipelineId = await ensureDefaultPipeline(organizationId);
	await ensureDefaultPipelineView(organizationId, pipelineId);
	const calendarId = await ensureDefaultCalendar(organizationId);
	return { pipelineId, calendarId };
}
