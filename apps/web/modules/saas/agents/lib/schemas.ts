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
export const agentGenderSchema = z.enum([
	"FEMININE",
	"MASCULINE",
	"NEUTRAL",
]);
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
