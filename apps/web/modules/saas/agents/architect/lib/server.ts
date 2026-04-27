import "server-only";
import { agentCreationSession, and, db, desc, eq } from "@repo/database";
import type { ArchitectDraftSnapshot } from "@repo/database/drizzle/schema/architect-session";

export type DraftSessionRow = {
	id: string;
	templateId: string;
	draftSnapshot: ArchitectDraftSnapshot | null;
	createdAt: Date;
	updatedAt: Date;
};

const DRAFT_SESSIONS_LIMIT = 6;

/**
 * Lista sessoes DRAFT ativas do usuario dentro da organizacao (story 09.1).
 *
 * Ordenacao: updatedAt DESC — rascunhos mexidos recentemente aparecem primeiro.
 * Limite: 6 — se passar disso a UI mostra um link "ver todos" (fora de escopo
 * desta story).
 *
 * Inclui apenas `status = 'DRAFT'` (PUBLISHED + ABANDONED filtrados).
 */
export async function getDraftSessions(
	userId: string,
	organizationId: string,
): Promise<DraftSessionRow[]> {
	const rows = await db
		.select({
			id: agentCreationSession.id,
			templateId: agentCreationSession.templateId,
			draftSnapshot: agentCreationSession.draftSnapshot,
			createdAt: agentCreationSession.createdAt,
			updatedAt: agentCreationSession.updatedAt,
		})
		.from(agentCreationSession)
		.where(
			and(
				eq(agentCreationSession.userId, userId),
				eq(agentCreationSession.organizationId, organizationId),
				eq(agentCreationSession.status, "DRAFT"),
			),
		)
		.orderBy(desc(agentCreationSession.updatedAt))
		.limit(DRAFT_SESSIONS_LIMIT);

	return rows;
}

export type ArchitectSessionRow = {
	id: string;
	organizationId: string;
	userId: string;
	templateId: string;
	status: "DRAFT" | "PUBLISHED" | "ABANDONED";
	draftSnapshot: ArchitectDraftSnapshot | null;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Carrega sessao do Arquiteto por id validando ownership + tenant (story 09.2).
 *
 * Retorna null se: sessao nao existe, nao pertence ao userId, ou nao pertence
 * a organizationId. Callers (page /agents/new) usam isso como guard + `notFound()`.
 */
export async function getArchitectSessionForUser(
	sessionId: string,
	userId: string,
	organizationId: string,
): Promise<ArchitectSessionRow | null> {
	const rows = await db
		.select({
			id: agentCreationSession.id,
			organizationId: agentCreationSession.organizationId,
			userId: agentCreationSession.userId,
			templateId: agentCreationSession.templateId,
			status: agentCreationSession.status,
			draftSnapshot: agentCreationSession.draftSnapshot,
			createdAt: agentCreationSession.createdAt,
			updatedAt: agentCreationSession.updatedAt,
		})
		.from(agentCreationSession)
		.where(
			and(
				eq(agentCreationSession.id, sessionId),
				eq(agentCreationSession.userId, userId),
				eq(agentCreationSession.organizationId, organizationId),
			),
		)
		.limit(1);

	return rows[0] ?? null;
}
