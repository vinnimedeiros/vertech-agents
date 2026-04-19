import "server-only";
import { agent, and, db, desc, eq, ne } from "@repo/database";
import { cache } from "react";

export type AgentListRow = {
	id: string;
	name: string;
	role: string | null;
	avatarUrl: string | null;
	status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
	model: string;
	version: number;
	whatsappInstanceId: string | null;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Lista todos os agentes NAO arquivados da org, ordenados do mais recente
 * pro mais antigo. Arquivados ficam invisiveis por default — Phase 07C
 * pode adicionar toggle "ver arquivados" se necessario.
 */
export const getAgentsByOrg = cache(
	async (organizationId: string): Promise<AgentListRow[]> => {
		return db
			.select({
				id: agent.id,
				name: agent.name,
				role: agent.role,
				avatarUrl: agent.avatarUrl,
				status: agent.status,
				model: agent.model,
				version: agent.version,
				whatsappInstanceId: agent.whatsappInstanceId,
				createdAt: agent.createdAt,
				updatedAt: agent.updatedAt,
			})
			.from(agent)
			.where(
				and(
					eq(agent.organizationId, organizationId),
					ne(agent.status, "ARCHIVED"),
				),
			)
			.orderBy(desc(agent.updatedAt));
	},
);

/**
 * Retorna o agente completo (row inteira) pelo ID.
 * Nao filtra por org — o consumidor (layout/page) e responsavel por garantir
 * que o agente pertence a organizacao ativa (cross-org guard).
 */
export const getAgentById = cache(async (agentId: string) => {
	const row = await db.query.agent.findFirst({
		where: eq(agent.id, agentId),
	});
	return row ?? null;
});
