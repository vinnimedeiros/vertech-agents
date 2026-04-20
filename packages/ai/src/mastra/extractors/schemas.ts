import { z } from "zod";

/**
 * Schemas Zod usados pelo extrator LLM secundário (arquitetura
 * extractor-driven, story 09.5 refactor).
 *
 * Cada schema corresponde ao `content` do artifact respectivo. O extrator
 * lê a conversa + vertical template e produz um objeto estrito nessa shape.
 *
 * Campos opcionais (`.nullable()`) permitem o extrator sinalizar "não sei
 * ainda" — upsert no DB só acontece quando os campos obrigatórios mínimos
 * estão preenchidos.
 */

export const businessProfileExtractSchema = z.object({
	businessName: z.string().nullable(),
	summary: z.string().nullable(),
	offering: z.array(z.string()),
	targetAudience: z.string().nullable(),
	goalForAgent: z.string().nullable(),
	differentiator: z.string().nullable(),
	industry: z.string().nullable(),
});

export const agentBlueprintExtractSchema = z.object({
	persona: z.object({
		name: z.string().nullable(),
		gender: z.enum(["FEMININE", "MASCULINE"]).nullable(),
		tone: z.number().min(0).max(100).nullable(),
		formality: z.number().min(0).max(100).nullable(),
		humor: z.number().min(0).max(100).nullable(),
		empathy: z.number().min(0).max(100).nullable(),
		antiPatterns: z.array(z.string()),
	}),
	salesTechniques: z.array(
		z.object({
			presetId: z.enum([
				"rapport",
				"spin",
				"aida",
				"pas",
				"objection",
				"followup",
			]),
			intensity: z.enum(["soft", "balanced", "aggressive"]),
		}),
	),
	emojiConfig: z.object({
		mode: z.enum(["none", "curated", "free"]),
		curatedList: z.array(z.string()),
	}),
	voiceConfig: z.object({
		enabled: z.boolean(),
	}),
	capabilities: z.array(
		z.enum([
			"qualification",
			"scheduling",
			"faq",
			"handoff",
			"followup",
		]),
	),
});

export const knowledgeBaseExtractSchema = z.object({
	additionalNotes: z.string().nullable(),
	domainAnswers: z.record(z.string(), z.string()),
});

export type BusinessProfileExtract = z.infer<typeof businessProfileExtractSchema>;
export type AgentBlueprintExtract = z.infer<typeof agentBlueprintExtractSchema>;
export type KnowledgeBaseExtract = z.infer<typeof knowledgeBaseExtractSchema>;
