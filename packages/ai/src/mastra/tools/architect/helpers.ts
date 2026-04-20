/**
 * Helpers compartilhados entre as architectTools (story 08A.3).
 *
 * - Extração de contexto Mastra (sessionId, userId, orgId, workingMemory)
 * - Consolidação de working memory em artifact content por tipo
 * - Navegação de etapas (ideation -> planning -> knowledge -> creation)
 * - Diff shallow entre objetos (usado por refineArtifact + updateAgentStructurally)
 * - Validação de checklist pré-publicação
 * - Derivação de enabledTools a partir de capabilities
 * - Builders auxiliares pra insert de agent
 *
 * **Working memory contract (Phase 08-alpha / 09.5 boundary):**
 * O shape completo está definido em tech-spec § 3.1 e será exposto via Zod em
 * `packages/ai/src/mastra/types/architect-working-memory.ts` na story 09.5.
 * Aqui consumimos como tipo opaco via `ArchitectWorkingMemory` e confiamos que
 * o Agent Arquiteto popule corretamente via `runtimeContext` ao invocar tools.
 */

import type {
	AgentBlueprintContent,
	BusinessProfileContent,
	FinalSummaryContent,
	KnowledgeBaseContent,
} from "@repo/database";
import { ArchitectToolError } from "./errors";

// =============================================================================
// Working memory shape (Phase 08-alpha — alinhado com tech-spec § 3.1)
// =============================================================================

export type ArchitectStage = "ideation" | "planning" | "knowledge" | "creation";
export type ChecklistItemStatus = "pending" | "in_progress" | "done";

export type IdeationChecklist = {
	businessName: string | null;
	industry: string | null;
	targetAudience: string | null;
	offering: string | null;
	differentiator: string | null;
	goalForAgent: string | null;
	ticketMean: string | null;
	status: ChecklistItemStatus;
};

export type PersonaChecklist = {
	name: string | null;
	gender: "feminine" | "masculine" | null;
	tone: number | null;
	formality: number | null;
	humor: number | null;
	empathy: number | null;
	antiPatterns: string[];
};

export type EmojiConfigChecklist = {
	mode: "none" | "curated" | "free";
	curatedList: string[];
	allowed: string[];
	forbidden: string[];
};

export type VoiceConfigChecklist = {
	enabled: boolean;
	provider: "elevenlabs" | "qwen-self-hosted" | null;
	voiceId: string | null;
	mode: "always_text" | "always_audio" | "triggered";
	triggers: string[];
};

export type SalesTechniqueChecklist = {
	presetId: string;
	intensity: "soft" | "balanced" | "aggressive";
};

export type Capability =
	| "qualification"
	| "scheduling"
	| "faq"
	| "handoff"
	| "followup";

export type PlanningChecklist = {
	persona: PersonaChecklist;
	salesTechniques: SalesTechniqueChecklist[];
	emojiConfig: EmojiConfigChecklist;
	voiceConfig: VoiceConfigChecklist;
	capabilities: Capability[];
	status: ChecklistItemStatus;
};

export type KnowledgeChecklist = {
	documentIds: string[];
	additionalNotes: string | null;
	domainAnswers: Record<string, string>;
	status: ChecklistItemStatus;
};

export type CreationChecklist = {
	finalized: boolean;
	publishedAgentId: string | null;
	status: ChecklistItemStatus;
};

export type ArchitectWorkingMemory = {
	sessionId: string;
	templateId: string;
	currentStage: ArchitectStage;
	checklist: {
		ideation: IdeationChecklist;
		planning: PlanningChecklist;
		knowledge: KnowledgeChecklist;
		creation: CreationChecklist;
	};
	artifactIds: {
		businessProfile: string | null;
		agentBlueprint: string | null;
		knowledgeBase: string | null;
		finalSummary: string | null;
	};
};

// =============================================================================
// Runtime context extraction
// =============================================================================

export type ArchitectRuntimeContext = {
	get: (key: string) => unknown;
};

export type ArchitectInvocationContext = {
	sessionId: string;
	userId: string;
	organizationId: string;
	workingMemory: ArchitectWorkingMemory;
};

/**
 * Lê os 4 campos obrigatórios do runtimeContext populado pelo Agent Arquiteto
 * (story 09.5). Falha cedo se algum estiver ausente — caso típico seria tool
 * invocada fora do contexto do Arquiteto (ex: teste unitário sem mock).
 */
export function requireArchitectContext(
	runtimeContext: ArchitectRuntimeContext | undefined,
): ArchitectInvocationContext {
	if (!runtimeContext) {
		throw new ArchitectToolError(
			"MISSING_CONTEXT",
			"runtimeContext obrigatório ausente (Agent Arquiteto não configurou).",
		);
	}

	const sessionId = runtimeContext.get("sessionId");
	const userId = runtimeContext.get("userId");
	const organizationId = runtimeContext.get("organizationId");
	const workingMemory = runtimeContext.get("workingMemory");

	if (typeof sessionId !== "string" || sessionId.length === 0) {
		throw new ArchitectToolError(
			"MISSING_CONTEXT",
			"runtimeContext.sessionId obrigatório ausente.",
		);
	}
	if (typeof userId !== "string" || userId.length === 0) {
		throw new ArchitectToolError(
			"MISSING_CONTEXT",
			"runtimeContext.userId obrigatório ausente.",
		);
	}
	if (typeof organizationId !== "string" || organizationId.length === 0) {
		throw new ArchitectToolError(
			"MISSING_CONTEXT",
			"runtimeContext.organizationId obrigatório ausente.",
		);
	}
	if (!workingMemory || typeof workingMemory !== "object") {
		throw new ArchitectToolError(
			"MISSING_CONTEXT",
			"runtimeContext.workingMemory obrigatório ausente (Agent Arquiteto deve popular via Mastra Memory API na story 09.5).",
		);
	}

	return {
		sessionId,
		userId,
		organizationId,
		workingMemory: workingMemory as ArchitectWorkingMemory,
	};
}

// =============================================================================
// Artifact type mapping
// =============================================================================

export type ArtifactTypeInput =
	| "business_profile"
	| "agent_blueprint"
	| "knowledge_base"
	| "final_summary";

const ARTIFACT_TYPE_DB_MAP: Record<
	ArtifactTypeInput,
	"BUSINESS_PROFILE" | "AGENT_BLUEPRINT" | "KNOWLEDGE_BASE" | "FINAL_SUMMARY"
> = {
	business_profile: "BUSINESS_PROFILE",
	agent_blueprint: "AGENT_BLUEPRINT",
	knowledge_base: "KNOWLEDGE_BASE",
	final_summary: "FINAL_SUMMARY",
};

const ARTIFACT_TYPE_STAGE: Record<ArtifactTypeInput, ArchitectStage> = {
	business_profile: "ideation",
	agent_blueprint: "planning",
	knowledge_base: "knowledge",
	final_summary: "creation",
};

export function artifactTypeToDb(type: ArtifactTypeInput) {
	return ARTIFACT_TYPE_DB_MAP[type];
}

export function getStageForArtifactType(
	type: ArtifactTypeInput,
): ArchitectStage {
	return ARTIFACT_TYPE_STAGE[type];
}

/**
 * Retorna a próxima etapa dado uma corrente.
 * Na Criação retorna null — sinal pro Arquiteto publicar.
 */
export function getNextStage(current: ArchitectStage): ArchitectStage | null {
	const order: ArchitectStage[] = [
		"ideation",
		"planning",
		"knowledge",
		"creation",
	];
	const idx = order.indexOf(current);
	if (idx < 0 || idx === order.length - 1) {
		return null;
	}
	return order[idx + 1] ?? null;
}

// =============================================================================
// Artifact content builders (tech-spec § 5.5 equivalent)
// =============================================================================

export function buildArtifactContent(
	type: ArtifactTypeInput,
	wm: ArchitectWorkingMemory,
):
	| BusinessProfileContent
	| AgentBlueprintContent
	| KnowledgeBaseContent
	| FinalSummaryContent {
	switch (type) {
		case "business_profile":
			return buildBusinessProfileContent(wm);
		case "agent_blueprint":
			return buildAgentBlueprintContent(wm);
		case "knowledge_base":
			return buildKnowledgeBaseContent(wm);
		case "final_summary":
			return buildFinalSummaryContent(wm);
	}
}

function buildBusinessProfileContent(
	wm: ArchitectWorkingMemory,
): BusinessProfileContent {
	const i = wm.checklist.ideation;
	return {
		businessName: i.businessName ?? "",
		summary: [i.industry, i.offering].filter(Boolean).join(" — "),
		offering: i.offering ? [i.offering] : [],
		targetAudience: i.targetAudience ?? "",
		goalForAgent: i.goalForAgent ?? "",
		differentiator: i.differentiator ?? undefined,
	};
}

function buildAgentBlueprintContent(
	wm: ArchitectWorkingMemory,
): AgentBlueprintContent {
	const p = wm.checklist.planning;
	return {
		persona: {
			name: p.persona.name ?? "",
			gender: (p.persona.gender ?? "feminine").toUpperCase() as
				| "FEMININE"
				| "MASCULINE",
			tone: p.persona.tone ?? 50,
			formality: p.persona.formality ?? 50,
			humor: p.persona.humor ?? 50,
			empathy: p.persona.empathy ?? 50,
			antiPatterns: p.persona.antiPatterns,
		},
		salesTechniques: p.salesTechniques,
		emojiConfig: {
			mode: p.emojiConfig.mode,
			curatedList: p.emojiConfig.curatedList,
			allowed: p.emojiConfig.allowed,
			forbidden: p.emojiConfig.forbidden,
		},
		voiceConfig: {
			enabled: p.voiceConfig.enabled,
			provider: p.voiceConfig.provider ?? undefined,
			voiceId: p.voiceConfig.voiceId ?? undefined,
			mode: p.voiceConfig.mode,
			triggers: p.voiceConfig.triggers,
		},
		capabilities: p.capabilities,
	};
}

function buildKnowledgeBaseContent(
	wm: ArchitectWorkingMemory,
): KnowledgeBaseContent {
	const k = wm.checklist.knowledge;
	return {
		// Resumo com apenas IDs aqui; a tool generateArtifact pode enriquecer com
		// title/status/chunkCount ao ler knowledge_document antes do insert.
		documents: k.documentIds.map((id) => ({
			id,
			title: "",
			status: "READY",
		})),
		additionalNotes: k.additionalNotes ?? undefined,
		domainAnswers: k.domainAnswers,
	};
}

function buildFinalSummaryContent(
	wm: ArchitectWorkingMemory,
): FinalSummaryContent {
	const i = wm.checklist.ideation;
	const p = wm.checklist.planning;
	const k = wm.checklist.knowledge;
	return {
		agentName: p.persona.name ?? "Agente",
		role: i.goalForAgent ?? "",
		businessSummary: [i.industry, i.offering].filter(Boolean).join(" — "),
		personaSummary: describePersona(p.persona),
		techniquesSummary: p.salesTechniques
			.map((t) => `${t.presetId} (${t.intensity})`)
			.join(", "),
		capabilitiesSummary: p.capabilities,
		knowledgeDocCount: k.documentIds.length,
	};
}

function describePersona(p: PersonaChecklist): string {
	const parts: string[] = [];
	if (p.name) parts.push(p.name);
	if (p.gender) parts.push(p.gender);
	if (p.tone !== null) parts.push(`tom ${p.tone}`);
	if (p.formality !== null) parts.push(`formalidade ${p.formality}`);
	return parts.join(", ");
}

// =============================================================================
// Checklist validation (pre-publish)
// =============================================================================

export type ChecklistValidationError = {
	stage: ArchitectStage;
	field: string;
	reason: string;
};

/**
 * Valida se o working memory está completo o suficiente pra publicar.
 * Usado em generateArtifact (valida etapa corrente) e publishAgentFromSession
 * (valida todas as etapas).
 */
export function validateChecklistForStage(
	wm: ArchitectWorkingMemory,
	stage: ArchitectStage,
): ChecklistValidationError[] {
	const errors: ChecklistValidationError[] = [];

	if (stage === "ideation") {
		const i = wm.checklist.ideation;
		if (!i.businessName)
			errors.push({
				stage,
				field: "businessName",
				reason: "obrigatório",
			});
		if (!i.industry)
			errors.push({ stage, field: "industry", reason: "obrigatório" });
		if (!i.targetAudience)
			errors.push({
				stage,
				field: "targetAudience",
				reason: "obrigatório",
			});
		if (!i.offering)
			errors.push({ stage, field: "offering", reason: "obrigatório" });
		if (!i.goalForAgent)
			errors.push({
				stage,
				field: "goalForAgent",
				reason: "obrigatório",
			});
	}

	if (stage === "planning") {
		const p = wm.checklist.planning.persona;
		if (!p.name)
			errors.push({
				stage,
				field: "persona.name",
				reason: "obrigatório",
			});
		if (!p.gender)
			errors.push({
				stage,
				field: "persona.gender",
				reason: "obrigatório",
			});
		if (p.tone === null)
			errors.push({
				stage,
				field: "persona.tone",
				reason: "obrigatório",
			});
		if (p.formality === null)
			errors.push({
				stage,
				field: "persona.formality",
				reason: "obrigatório",
			});
		if (wm.checklist.planning.capabilities.length === 0)
			errors.push({
				stage,
				field: "capabilities",
				reason: "ao menos 1 capability",
			});
	}

	if (stage === "knowledge") {
		// Knowledge é opcional: usuário pode não ter docs. Só valida se algum
		// doc está referenciado mas em erro.
	}

	if (stage === "creation") {
		// Creation é meta-etapa: valida TODAS as anteriores
		errors.push(...validateChecklistForStage(wm, "ideation"));
		errors.push(...validateChecklistForStage(wm, "planning"));
		errors.push(...validateChecklistForStage(wm, "knowledge"));
	}

	return errors;
}

export function validateFullChecklist(
	wm: ArchitectWorkingMemory,
): ChecklistValidationError[] {
	return validateChecklistForStage(wm, "creation");
}

// =============================================================================
// Diff helper (shallow + deep-1 level)
// =============================================================================

export type FieldDiff = {
	field: string;
	before: unknown;
	after: unknown;
};

export function computeDiff(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
): FieldDiff[] {
	const diffs: FieldDiff[] = [];
	const seen: Record<string, true> = {};
	const allKeys = [...Object.keys(before), ...Object.keys(after)];

	for (const key of allKeys) {
		if (seen[key]) continue;
		seen[key] = true;
		const b = before[key];
		const a = after[key];
		if (!deepEqual(b, a)) {
			diffs.push({ field: key, before: b, after: a });
		}
	}

	return diffs;
}

function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (a === null || b === null) return false;
	if (typeof a === "object") {
		return JSON.stringify(a) === JSON.stringify(b);
	}
	return false;
}

// =============================================================================
// Capability -> tool key derivation (usado no publish)
// =============================================================================

const CAPABILITY_TO_TOOLS: Record<Capability, string[]> = {
	qualification: ["updateLeadData", "moveLeadStage"],
	scheduling: ["scheduleMeeting"],
	faq: ["searchKnowledgeBase"],
	handoff: ["handoffToHuman"],
	followup: ["createLeadActivity"],
};

export function deriveToolsFromCapabilities(
	capabilities: Capability[],
): string[] {
	const seen: Record<string, true> = {};
	const out: string[] = [];
	for (const cap of capabilities) {
		for (const tool of CAPABILITY_TO_TOOLS[cap] ?? []) {
			if (!seen[tool]) {
				seen[tool] = true;
				out.push(tool);
			}
		}
	}
	return out;
}
