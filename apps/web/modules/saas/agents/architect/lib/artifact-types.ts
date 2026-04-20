/**
 * Types compartilhados do sistema de artefatos do Arquiteto (story 09.6).
 *
 * Espelha `agent_artifact` do DB mas tipado no shape consumido pelo UI.
 */

export type ArtifactType =
	| "BUSINESS_PROFILE"
	| "AGENT_BLUEPRINT"
	| "KNOWLEDGE_BASE"
	| "FINAL_SUMMARY";

export type ArtifactStatus = "GENERATED" | "REGENERATED" | "APPROVED";

export type BusinessProfileContent = {
	businessName: string;
	summary: string;
	offering: string[];
	targetAudience: string;
	goalForAgent: string;
	differentiator?: string;
};

export type AgentBlueprintContent = {
	persona: {
		name: string;
		gender: "FEMININE" | "MASCULINE";
		tone: number;
		formality: number;
		humor: number;
		empathy: number;
		antiPatterns: string[];
	};
	salesTechniques: Array<{
		presetId: string;
		intensity: "soft" | "balanced" | "aggressive";
	}>;
	emojiConfig: {
		mode: "none" | "curated" | "free";
		curatedList?: string[];
		allowed?: string[];
		forbidden?: string[];
	};
	voiceConfig: {
		enabled: boolean;
		provider?: string;
		voiceId?: string;
		mode: "always_text" | "always_audio" | "triggered";
		triggers?: string[];
	};
	capabilities: string[];
};

export type KnowledgeBaseContent = {
	documents: Array<{
		id: string;
		title: string;
		status: string;
		chunkCount?: number;
	}>;
	additionalNotes?: string;
	domainAnswers?: Record<string, string>;
};

export type FinalSummaryContent = {
	agentName: string;
	role: string;
	businessSummary: string;
	personaSummary: string;
	techniquesSummary: string;
	capabilitiesSummary: string[];
	knowledgeDocCount: number;
};

export type ArtifactContentByType = {
	BUSINESS_PROFILE: BusinessProfileContent;
	AGENT_BLUEPRINT: AgentBlueprintContent;
	KNOWLEDGE_BASE: KnowledgeBaseContent;
	FINAL_SUMMARY: FinalSummaryContent;
};

export type ArchitectArtifact = {
	id: string;
	sessionId: string;
	type: ArtifactType;
	content: unknown;
	status: ArtifactStatus;
	version: number;
	approvedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
	BUSINESS_PROFILE: "Perfil do Negócio",
	AGENT_BLUEPRINT: "Blueprint do Agente",
	KNOWLEDGE_BASE: "Base de Conhecimento",
	FINAL_SUMMARY: "Resumo Final",
};

export const ARTIFACT_TYPE_EMOJIS: Record<ArtifactType, string> = {
	BUSINESS_PROFILE: "📋",
	AGENT_BLUEPRINT: "🎭",
	KNOWLEDGE_BASE: "📚",
	FINAL_SUMMARY: "✨",
};

export const SALES_TECHNIQUE_LABELS: Record<string, string> = {
	rapport: "Rapport",
	spin: "SPIN",
	aida: "AIDA",
	pas: "PAS",
	objection: "Objeção",
	followup: "Follow-up",
};

export const CAPABILITY_LABELS: Record<string, string> = {
	qualification: "Qualificação",
	scheduling: "Agendamento",
	faq: "FAQ",
	handoff: "Handoff humano",
	followup: "Follow-up",
};
