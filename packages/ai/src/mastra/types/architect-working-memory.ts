import { z } from "zod";

/**
 * Working memory schema do Arquiteto (tech-spec § 3.1, story 09.5).
 *
 * Consumido pelo `Memory` do Mastra na config `workingMemory.schema`. O Mastra
 * (a) serializa/valida o shape ao persistir e (b) injeta o JSON no prompt
 * automaticamente. Tools do Arquiteto leem via `requestContext.get('workingMemory')`.
 *
 * Esse shape espelha o tipo opaco `ArchitectWorkingMemory` em
 * `packages/ai/src/mastra/tools/architect/helpers.ts` (08A.3). A 09.5 fecha o
 * loop trocando o tipo opaco pela inferência do schema Zod.
 */
export const architectWorkingMemorySchema = z.object({
	sessionId: z.string().min(1),
	templateId: z.enum([
		"clinical",
		"ecommerce",
		"real_estate",
		"info_product",
		"saas",
		"local_services",
		"custom",
	]),

	currentStage: z
		.enum(["ideation", "planning", "knowledge", "creation"])
		.default("ideation"),

	checklist: z
		.object({
			ideation: z
				.object({
					businessName: z.string().nullable().default(null),
					industry: z.string().nullable().default(null),
					targetAudience: z.string().nullable().default(null),
					offering: z.string().nullable().default(null),
					differentiator: z.string().nullable().default(null),
					goalForAgent: z.string().nullable().default(null),
					ticketMean: z.string().nullable().default(null),
					status: z
						.enum(["pending", "in_progress", "done"])
						.default("pending"),
				})
				.default({
					businessName: null,
					industry: null,
					targetAudience: null,
					offering: null,
					differentiator: null,
					goalForAgent: null,
					ticketMean: null,
					status: "pending",
				}),

			planning: z
				.object({
					persona: z
						.object({
							name: z.string().nullable().default(null),
							gender: z
								.enum(["feminine", "masculine"])
								.nullable()
								.default(null),
							tone: z
								.number()
								.min(0)
								.max(100)
								.nullable()
								.default(null),
							formality: z
								.number()
								.min(0)
								.max(100)
								.nullable()
								.default(null),
							humor: z
								.number()
								.min(0)
								.max(100)
								.nullable()
								.default(null),
							empathy: z
								.number()
								.min(0)
								.max(100)
								.nullable()
								.default(null),
							antiPatterns: z.array(z.string()).default([]),
						})
						.default({
							name: null,
							gender: null,
							tone: null,
							formality: null,
							humor: null,
							empathy: null,
							antiPatterns: [],
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
								intensity: z.enum([
									"soft",
									"balanced",
									"aggressive",
								]),
							}),
						)
						.default([]),

					emojiConfig: z
						.object({
							mode: z
								.enum(["none", "curated", "free"])
								.default("curated"),
							curatedList: z.array(z.string()).default([]),
							allowed: z.array(z.string()).default([]),
							forbidden: z.array(z.string()).default([]),
						})
						.default({
							mode: "curated",
							curatedList: [],
							allowed: [],
							forbidden: [],
						}),

					voiceConfig: z
						.object({
							enabled: z.boolean().default(false),
							provider: z
								.enum(["elevenlabs", "qwen-self-hosted"])
								.nullable()
								.default(null),
							voiceId: z.string().nullable().default(null),
							mode: z
								.enum([
									"always_text",
									"always_audio",
									"triggered",
								])
								.default("always_text"),
							triggers: z.array(z.string()).default([]),
						})
						.default({
							enabled: false,
							provider: null,
							voiceId: null,
							mode: "always_text",
							triggers: [],
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

					status: z
						.enum(["pending", "in_progress", "done"])
						.default("pending"),
				})
				.default({
					persona: {
						name: null,
						gender: null,
						tone: null,
						formality: null,
						humor: null,
						empathy: null,
						antiPatterns: [],
					},
					salesTechniques: [],
					emojiConfig: {
						mode: "curated",
						curatedList: [],
						allowed: [],
						forbidden: [],
					},
					voiceConfig: {
						enabled: false,
						provider: null,
						voiceId: null,
						mode: "always_text",
						triggers: [],
					},
					capabilities: [],
					status: "pending",
				}),

			knowledge: z
				.object({
					documentIds: z.array(z.string()).default([]),
					additionalNotes: z.string().nullable().default(null),
					domainAnswers: z.record(z.string(), z.string()).default({}),
					status: z
						.enum(["pending", "in_progress", "done"])
						.default("pending"),
				})
				.default({
					documentIds: [],
					additionalNotes: null,
					domainAnswers: {},
					status: "pending",
				}),

			creation: z
				.object({
					finalized: z.boolean().default(false),
					publishedAgentId: z.string().nullable().default(null),
					status: z
						.enum(["pending", "in_progress", "done"])
						.default("pending"),
				})
				.default({
					finalized: false,
					publishedAgentId: null,
					status: "pending",
				}),
		})
		.default({
			ideation: {
				businessName: null,
				industry: null,
				targetAudience: null,
				offering: null,
				differentiator: null,
				goalForAgent: null,
				ticketMean: null,
				status: "pending",
			},
			planning: {
				persona: {
					name: null,
					gender: null,
					tone: null,
					formality: null,
					humor: null,
					empathy: null,
					antiPatterns: [],
				},
				salesTechniques: [],
				emojiConfig: {
					mode: "curated",
					curatedList: [],
					allowed: [],
					forbidden: [],
				},
				voiceConfig: {
					enabled: false,
					provider: null,
					voiceId: null,
					mode: "always_text",
					triggers: [],
				},
				capabilities: [],
				status: "pending",
			},
			knowledge: {
				documentIds: [],
				additionalNotes: null,
				domainAnswers: {},
				status: "pending",
			},
			creation: {
				finalized: false,
				publishedAgentId: null,
				status: "pending",
			},
		}),

	artifactIds: z
		.object({
			businessProfile: z.string().nullable().default(null),
			agentBlueprint: z.string().nullable().default(null),
			knowledgeBase: z.string().nullable().default(null),
			finalSummary: z.string().nullable().default(null),
		})
		.default({
			businessProfile: null,
			agentBlueprint: null,
			knowledgeBase: null,
			finalSummary: null,
		}),
});

export type ArchitectWorkingMemorySchema = z.infer<
	typeof architectWorkingMemorySchema
>;
