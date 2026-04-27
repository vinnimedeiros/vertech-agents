import { z } from "zod";

/**
 * Schema Zod completo do AgentBlueprint (story 09.8).
 *
 * Consumido pelo refinamento via Dialog. Payload direto pro server
 * action `/api/architect/artifacts/[id]/refine-blueprint`.
 */

export const blueprintRefineSchema = z.object({
	persona: z.object({
		name: z.string().min(1, "Obrigatório").max(50),
		gender: z.enum(["FEMININE", "MASCULINE"]),
		tone: z.number().int().min(0).max(100),
		formality: z.number().int().min(0).max(100),
		humor: z.number().int().min(0).max(100),
		empathy: z.number().int().min(0).max(100),
		antiPatterns: z.array(z.string().min(1).max(200)).max(20),
	}),
	salesTechniques: z
		.array(
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
		)
		.max(6),
	emojiConfig: z.object({
		mode: z.enum(["none", "curated", "free"]),
		curatedList: z.array(z.string()).max(30).default([]),
		allowed: z.array(z.string()).default([]),
		forbidden: z.array(z.string()).default([]),
	}),
	voiceConfig: z.object({
		enabled: z.boolean(),
		provider: z.enum(["elevenlabs", "qwen-self-hosted"]).nullable(),
		voiceId: z.string().nullable(),
		mode: z.enum(["always_text", "always_audio", "triggered"]),
		triggers: z.array(z.string()).default([]),
	}),
	capabilities: z
		.array(
			z.enum([
				"qualification",
				"scheduling",
				"faq",
				"handoff",
				"followup",
			]),
		)
		.default([]),
});

export type BlueprintRefineInput = z.infer<typeof blueprintRefineSchema>;

export const SALES_TECHNIQUE_OPTIONS: Array<{
	id:
		| "rapport"
		| "spin"
		| "aida"
		| "pas"
		| "objection"
		| "followup";
	label: string;
}> = [
	{ id: "rapport", label: "Rapport" },
	{ id: "spin", label: "SPIN" },
	{ id: "aida", label: "AIDA" },
	{ id: "pas", label: "PAS" },
	{ id: "objection", label: "Objeção" },
	{ id: "followup", label: "Follow-up" },
];

export const CAPABILITY_OPTIONS: Array<{
	id:
		| "qualification"
		| "scheduling"
		| "faq"
		| "handoff"
		| "followup";
	label: string;
}> = [
	{ id: "qualification", label: "Qualificação" },
	{ id: "scheduling", label: "Agendamento" },
	{ id: "faq", label: "FAQ" },
	{ id: "handoff", label: "Handoff humano" },
	{ id: "followup", label: "Follow-up" },
];
