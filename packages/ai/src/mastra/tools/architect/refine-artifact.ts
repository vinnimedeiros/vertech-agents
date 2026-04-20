import { openai } from "@ai-sdk/openai";
import { createTool } from "@mastra/core/tools";
import { agentArtifact, and, db, eq } from "@repo/database";
import { generateObject } from "ai";
import { z } from "zod";
import { ArchitectToolError, toFailure } from "./errors";
import {
	type ArchitectRuntimeContext,
	computeDiff,
	requireArchitectContext,
} from "./helpers";

const inputSchema = z.object({
	artifactId: z.string().min(1),
	instruction: z.string().min(5).max(500),
});

const outputSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		artifact: z.object({
			id: z.string(),
			type: z.string(),
			content: z.record(z.string(), z.any()),
			status: z.literal("REGENERATED"),
			version: z.number().int(),
		}),
		diff: z.array(
			z.object({
				field: z.string(),
				before: z.any(),
				after: z.any(),
			}),
		),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
		message: z.string(),
		details: z.unknown().optional(),
	}),
]);

const REFINE_MODEL = "gpt-4o-mini" as const;

/**
 * Sub-call LLM que aplica uma instrução em linguagem natural ao conteúdo
 * atual do artefato. Usa gpt-4o-mini (mais barato que o modelo principal
 * do Arquiteto conforme tech spec § 4.2.3 notes). Retorna JSON no mesmo
 * schema do input — se o LLM violar o shape, o Zod relançará e o catch
 * externo converterá em failure.
 */
async function regenerateArtifactContent(
	currentContent: Record<string, unknown>,
	instruction: string,
	artifactType: string,
): Promise<Record<string, unknown>> {
	const { object } = await generateObject({
		model: openai(REFINE_MODEL),
		schema: z.record(z.string(), z.any()),
		prompt: `Você é um assistente que refina artefatos estruturados do Arquiteto de agentes.
Aplique a instrução do usuário ao JSON atual, preservando o shape exato.
NÃO adicione campos novos que não existiam; NÃO remova campos que existem.
Retorne APENAS o JSON modificado.

Tipo do artefato: ${artifactType}

Instrução do usuário:
"""
${instruction}
"""

JSON atual:
${JSON.stringify(currentContent, null, 2)}`,
	});

	return object as Record<string, unknown>;
}

/**
 * Tool 3 — refineArtifact (story 08A.3).
 *
 * Regenera content do artefato aplicando instrução em pt-BR. Optimistic
 * locking via version column (AC10): UPDATE condicional WHERE version = old;
 * se zero rows afetadas, retorna CONCURRENT_UPDATE pro Arquiteto retentar.
 *
 * Artefato com status APPROVED é imutável (AC9).
 */
export const refineArtifact = createTool({
	id: "refine-artifact",
	description: `Regenera um artefato aplicando instrução em linguagem natural do usuário.
Use quando usuário disser [Mandar alteração no chat] seguido de uma instrução.
NÃO use pra mudanças pontuais (usar approveArtifact com patch).`,
	inputSchema,
	outputSchema,
	execute: async ({ context, requestContext }) => {
		try {
			requireArchitectContext(
				requestContext as ArchitectRuntimeContext | undefined,
			);

			const { artifactId, instruction } = context;

			const current = await db.query.agentArtifact.findFirst({
				where: eq(agentArtifact.id, artifactId),
			});

			if (!current) {
				throw new ArchitectToolError(
					"ARTIFACT_NOT_FOUND",
					`Artefato ${artifactId} não existe.`,
				);
			}

			if (current.status === "APPROVED") {
				throw new ArchitectToolError(
					"ARTIFACT_LOCKED",
					"Artefato aprovado não pode ser refinado. Desaprove primeiro ou gere um novo.",
				);
			}

			const newContent = await regenerateArtifactContent(
				current.content as Record<string, unknown>,
				instruction,
				current.type,
			);

			// Optimistic locking: UPDATE com WHERE version = atual. Se outro
			// processo atualizou a row (aprovou, regenerou), zero rows afetadas
			// e a tool retorna CONCURRENT_UPDATE pro Arquiteto retentar.
			const nextVersion = current.version + 1;
			const updated = await db
				.update(agentArtifact)
				.set({
					content: newContent as never,
					status: "REGENERATED",
					version: nextVersion,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(agentArtifact.id, artifactId),
						eq(agentArtifact.version, current.version),
					),
				)
				.returning();

			if (updated.length === 0) {
				throw new ArchitectToolError(
					"CONCURRENT_UPDATE",
					`Artefato ${artifactId} foi modificado concorrentemente. Recarregue e tente de novo.`,
				);
			}

			return {
				success: true as const,
				artifact: {
					id: artifactId,
					type: current.type,
					content: newContent,
					status: "REGENERATED" as const,
					version: nextVersion,
				},
				diff: computeDiff(
					current.content as Record<string, unknown>,
					newContent,
				),
			};
		} catch (err) {
			return toFailure(err);
		}
	},
});
