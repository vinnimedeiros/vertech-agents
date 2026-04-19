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
