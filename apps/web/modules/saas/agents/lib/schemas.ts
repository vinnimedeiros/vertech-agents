import { SUPPORTED_MODEL_IDS } from "@repo/ai/models";
import { z } from "zod";

// =============================================
// Primitivos reutilizaveis
// =============================================

/** Status operacional do agente — espelha o enum do DB. */
export const agentStatusSchema = z.enum([
	"DRAFT",
	"ACTIVE",
	"PAUSED",
	"ARCHIVED",
]);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

/** Generos suportados na aba Identidade. Persistido como varchar no DB. */
export const agentGenderSchema = z.enum(["FEMININE", "MASCULINE"]);
export type AgentGender = z.infer<typeof agentGenderSchema>;

/** Validacao do ID do modelo contra o registry curado. */
export const modelIdSchema = z
	.string()
	.refine((v) => SUPPORTED_MODEL_IDS.includes(v), {
		message: "Modelo nao suportado",
	});

// =============================================
// Inputs de server actions (Story 07B.1)
// =============================================

export const createAgentInputSchema = z.object({
	organizationId: z.string().min(1),
	name: z
		.string()
		.trim()
		.min(2, "Nome precisa ter pelo menos 2 caracteres")
		.max(80, "Nome pode ter no maximo 80 caracteres"),
	role: z
		.string()
		.trim()
		.max(80, "Funcao pode ter no maximo 80 caracteres")
		.optional()
		.transform((v) => (v ? v : null)),
	model: modelIdSchema,
});
export type CreateAgentInput = z.infer<typeof createAgentInputSchema>;

export const agentIdInputSchema = z.object({
	agentId: z.string().min(1),
});
export type AgentIdInput = z.infer<typeof agentIdInputSchema>;

export const toggleStatusInputSchema = z.object({
	agentId: z.string().min(1),
	to: z.enum(["ACTIVE", "PAUSED"]),
});
export type ToggleStatusInput = z.infer<typeof toggleStatusInputSchema>;

// =============================================
// Aba Identidade (Story 07B.3) — schema aqui porque o header da 07B.2
// reusa via inline edit do nome (paridade 1:1 com a aba)
// =============================================

export const identitySchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Nome precisa ter pelo menos 2 caracteres")
		.max(80, "Nome pode ter no maximo 80 caracteres"),
	role: z
		.string()
		.trim()
		.max(80, "Funcao pode ter no maximo 80 caracteres")
		.nullable()
		.transform((v) => (v && v.length > 0 ? v : null)),
	avatarUrl: z
		.string()
		.url("URL invalida")
		.nullable()
		.or(z.literal("").transform(() => null)),
	gender: agentGenderSchema,
	description: z
		.string()
		.trim()
		.max(500, "Descricao pode ter no maximo 500 caracteres")
		.nullable()
		.transform((v) => (v && v.length > 0 ? v : null)),
});
export type IdentityInput = z.infer<typeof identitySchema>;

/** Input mais restrito pro inline edit do nome no header (so name). */
export const renameAgentInputSchema = z.object({
	agentId: z.string().min(1),
	name: z
		.string()
		.trim()
		.min(2, "Nome precisa ter pelo menos 2 caracteres")
		.max(80, "Nome pode ter no maximo 80 caracteres"),
});
export type RenameAgentInput = z.infer<typeof renameAgentInputSchema>;

/** Input completo da aba Identidade — consumido em 07B.3. */
export const updateIdentityInputSchema = identitySchema.extend({
	agentId: z.string().min(1),
});
export type UpdateIdentityInput = z.infer<typeof updateIdentityInputSchema>;

// =============================================
// Aba Persona (Story 07B.4) — 4 eixos como enums
// =============================================
// Valores espelham exatamente o tipo AgentPersonality em
// packages/database/drizzle/schema/agents.ts. O builder de instructions
// da Phase 07A (packages/ai/src/mastra/instructions/builder.ts) consome
// esses enums diretamente — zero conversao necessaria.

export const toneSchema = z.enum([
	"formal",
	"semiformal",
	"informal",
	"descontraido",
]);
export type Tone = z.infer<typeof toneSchema>;

export const formalitySchema = z.enum([
	"voce_sem_girias",
	"tu",
	"vc_girias",
	"formal",
]);
export type Formality = z.infer<typeof formalitySchema>;

export const humorSchema = z.enum([
	"sem_humor",
	"seco",
	"leve",
	"descontraido",
]);
export type Humor = z.infer<typeof humorSchema>;

export const empathyLevelSchema = z.enum(["baixa", "media", "alta"]);
export type EmpathyLevel = z.infer<typeof empathyLevelSchema>;

export const personalitySchema = z.object({
	tone: toneSchema,
	formality: formalitySchema,
	humor: humorSchema,
	empathyLevel: empathyLevelSchema,
});
export type PersonalityInput = z.infer<typeof personalitySchema>;

export const updatePersonaInputSchema = personalitySchema.extend({
	agentId: z.string().min(1),
});
export type UpdatePersonaInput = z.infer<typeof updatePersonaInputSchema>;

// =============================================
// Aba Negocio (Story 07B.5)
// =============================================
// Espelha o tipo AgentBusinessContext do schema. inviolableRules entra
// aqui porque vive em agent.businessContext no DB (nao em personality).

export const businessContextSchema = z.object({
	industry: z
		.string()
		.trim()
		.max(80, "Indústria pode ter no máximo 80 caracteres")
		.nullable()
		.transform((v) => (v && v.length > 0 ? v : null)),
	products: z
		.string()
		.trim()
		.max(2000, "Texto muito longo (máx 2000 caracteres)")
		.nullable()
		.transform((v) => (v && v.length > 0 ? v : null)),
	pricing: z
		.string()
		.trim()
		.max(500, "Texto muito longo (máx 500 caracteres)")
		.nullable()
		.transform((v) => (v && v.length > 0 ? v : null)),
	policies: z
		.string()
		.trim()
		.max(1000, "Texto muito longo (máx 1000 caracteres)")
		.nullable()
		.transform((v) => (v && v.length > 0 ? v : null)),
	inviolableRules: z
		.array(z.string().trim().min(1).max(200))
		.max(20, "Máximo 20 regras"),
});
export type BusinessContextInput = z.infer<typeof businessContextSchema>;

export const updateBusinessInputSchema = businessContextSchema.extend({
	agentId: z.string().min(1),
});
export type UpdateBusinessInput = z.infer<typeof updateBusinessInputSchema>;

// =============================================
// Aba Conversas (Story 07B.6)
// =============================================
// Espelha AgentConversationStyle do schema.

export const conversationStyleSchema = z.object({
	greeting: z
		.string()
		.trim()
		.max(300, "Saudação pode ter no máximo 300 caracteres")
		.nullable()
		.transform((v) => (v && v.length > 0 ? v : null)),
	qualificationQuestions: z
		.array(z.string().trim().min(1).max(200))
		.max(10, "Máximo 10 perguntas"),
	objectionHandling: z
		.string()
		.trim()
		.max(1000, "Texto muito longo (máx 1000 caracteres)")
		.nullable()
		.transform((v) => (v && v.length > 0 ? v : null)),
	handoffTriggers: z
		.array(z.string().trim().min(1).max(150))
		.max(10, "Máximo 10 gatilhos"),
});
export type ConversationStyleInput = z.infer<typeof conversationStyleSchema>;

export const updateConversationInputSchema = conversationStyleSchema.extend({
	agentId: z.string().min(1),
});
export type UpdateConversationInput = z.infer<
	typeof updateConversationInputSchema
>;

// =============================================
// Aba Modelo (Story 07B.7)
// =============================================

export const modelConfigSchema = z.object({
	model: modelIdSchema,
	temperature: z
		.number()
		.min(0, "Temperatura mínima é 0")
		.max(2, "Temperatura máxima é 2"),
	maxSteps: z
		.number()
		.int()
		.min(1, "Mínimo 1 passo")
		.max(20, "Máximo 20 passos"),
});
export type ModelConfigInput = z.infer<typeof modelConfigSchema>;

export const updateModelInputSchema = modelConfigSchema.extend({
	agentId: z.string().min(1),
});
export type UpdateModelInput = z.infer<typeof updateModelInputSchema>;

// =============================================
// Aba WhatsApp (Story 07B.8)
// =============================================

export const linkWhatsAppInputSchema = z.object({
	agentId: z.string().min(1),
	whatsappInstanceId: z.string().min(1),
});
export type LinkWhatsAppInput = z.infer<typeof linkWhatsAppInputSchema>;
