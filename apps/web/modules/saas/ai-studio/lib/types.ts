import type { agent, team, teamMember } from "@repo/database";

export type TeamRow = typeof team.$inferSelect;
export type TeamMemberRow = typeof teamMember.$inferSelect;
export type AgentRow = typeof agent.$inferSelect;
export type TeamMemberRole = TeamMemberRow["role"];

export type TeamWithMembers = TeamRow & {
	members: Array<TeamMemberRow & { agent: AgentRow }>;
};

export const ROLE_LABELS: Record<TeamMemberRole, string> = {
	SUPERVISOR: "Atendente",
	ANALYST: "Analista",
	CAMPAIGNS: "Campanhas",
	ASSISTANT: "Assistente",
};

export const ROLE_COLORS: Record<TeamMemberRole, string> = {
	SUPERVISOR: "text-lime-400 border-lime-500/30 bg-lime-500/10",
	ANALYST: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
	CAMPAIGNS: "text-orange-400 border-orange-500/30 bg-orange-500/10",
	ASSISTANT: "text-violet-400 border-violet-500/30 bg-violet-500/10",
};
