/**
 * Testes do publishAgentFromSession e helpers compartilhados (story 08A.3).
 *
 * Foco:
 * - Validação de checklist pré-publicação (AC17)
 * - Context guards (AC23 — MISSING_CONTEXT)
 * - Mapeamento de artifact type <-> stage
 * - Navegação de etapas (getNextStage)
 * - Build de artifact content por tipo
 * - Diff shallow/deep-1
 * - Derivação de tools a partir de capabilities
 * - Error classes estruturadas (AC23)
 *
 * A transação atômica propriamente dita (Postgres rollback) é validada em
 * integration test com DB real na story 08A.5 (Quality Gate). Aqui validamos
 * o contract e os guards que precedem a tx.
 */

import { describe, expect, it } from "vitest";
import {
	type ArchitectErrorCode,
	ArchitectToolError,
	toFailure,
} from "../errors";
import {
	type ArchitectWorkingMemory,
	buildArtifactContent,
	computeDiff,
	deriveToolsFromCapabilities,
	getNextStage,
	getStageForArtifactType,
	requireArchitectContext,
	validateChecklistForStage,
	validateFullChecklist,
} from "../helpers";

function makeWorkingMemory(
	patch: Partial<ArchitectWorkingMemory> = {},
): ArchitectWorkingMemory {
	return {
		sessionId: "sess_1",
		templateId: "clinical",
		currentStage: "ideation",
		checklist: {
			ideation: {
				businessName: "Clínica Teste",
				industry: "Saúde",
				targetAudience: "Mulheres 30-55",
				offering: "Procedimentos estéticos",
				differentiator: "Equipe premium",
				goalForAgent: "Agendar consultas",
				ticketMean: "R$ 800",
				status: "done",
			},
			planning: {
				persona: {
					name: "Ana",
					gender: "feminine",
					tone: 60,
					formality: 40,
					humor: 50,
					empathy: 80,
					antiPatterns: ["nunca usar jargão técnico"],
				},
				salesTechniques: [
					{ presetId: "rapport", intensity: "balanced" },
				],
				emojiConfig: {
					mode: "curated",
					curatedList: ["💆", "✨"],
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
				capabilities: ["qualification", "scheduling"],
				status: "done",
			},
			knowledge: {
				documentIds: ["doc_1", "doc_2"],
				additionalNotes: null,
				domainAnswers: {},
				status: "done",
			},
			creation: {
				finalized: false,
				publishedAgentId: null,
				status: "pending",
			},
		},
		artifactIds: {
			businessProfile: "art_bp",
			agentBlueprint: "art_ab",
			knowledgeBase: "art_kb",
			finalSummary: null,
		},
		...patch,
	};
}

describe("architectTools — helpers (story 08A.3)", () => {
	describe("requireArchitectContext (AC23 — MISSING_CONTEXT)", () => {
		it("extrai sessionId/userId/orgId/workingMemory do runtimeContext", () => {
			const wm = makeWorkingMemory();
			const ctx = requireArchitectContext({
				get: (key: string) => {
					if (key === "sessionId") return "sess_1";
					if (key === "userId") return "user_1";
					if (key === "organizationId") return "org_1";
					if (key === "workingMemory") return wm;
					return undefined;
				},
			});
			expect(ctx.sessionId).toBe("sess_1");
			expect(ctx.userId).toBe("user_1");
			expect(ctx.organizationId).toBe("org_1");
			expect(ctx.workingMemory).toBe(wm);
		});

		it("throw MISSING_CONTEXT quando runtimeContext é undefined", () => {
			expect(() => requireArchitectContext(undefined)).toThrow(
				ArchitectToolError,
			);
		});

		it("throw MISSING_CONTEXT quando sessionId falta", () => {
			expect(() =>
				requireArchitectContext({ get: () => undefined }),
			).toThrow(/sessionId/);
		});

		it("throw MISSING_CONTEXT quando workingMemory falta", () => {
			expect(() =>
				requireArchitectContext({
					get: (key: string) => {
						if (key === "sessionId") return "sess_1";
						if (key === "userId") return "user_1";
						if (key === "organizationId") return "org_1";
						return undefined;
					},
				}),
			).toThrow(/workingMemory/);
		});
	});

	describe("validateChecklistForStage", () => {
		it("retorna [] quando ideation está completa", () => {
			const wm = makeWorkingMemory();
			expect(validateChecklistForStage(wm, "ideation")).toEqual([]);
		});

		it("retorna erros quando ideation faltando businessName/industry", () => {
			const wm = makeWorkingMemory({
				checklist: {
					...makeWorkingMemory().checklist,
					ideation: {
						...makeWorkingMemory().checklist.ideation,
						businessName: null,
						industry: null,
					},
				},
			});
			const errors = validateChecklistForStage(wm, "ideation");
			expect(errors.length).toBeGreaterThanOrEqual(2);
			expect(errors.some((e) => e.field === "businessName")).toBe(true);
			expect(errors.some((e) => e.field === "industry")).toBe(true);
		});

		it("retorna [] quando planning está completa", () => {
			const wm = makeWorkingMemory();
			expect(validateChecklistForStage(wm, "planning")).toEqual([]);
		});

		it("retorna erros quando planning sem capabilities", () => {
			const wm = makeWorkingMemory();
			wm.checklist.planning.capabilities = [];
			const errors = validateChecklistForStage(wm, "planning");
			expect(errors.some((e) => e.field === "capabilities")).toBe(true);
		});

		it("knowledge vazio não é erro (opcional)", () => {
			const wm = makeWorkingMemory();
			wm.checklist.knowledge.documentIds = [];
			expect(validateChecklistForStage(wm, "knowledge")).toEqual([]);
		});
	});

	describe("validateFullChecklist (AC17 — pre-publish)", () => {
		it("retorna [] para WM completo", () => {
			expect(validateFullChecklist(makeWorkingMemory())).toEqual([]);
		});

		it("aggrega erros de todas as etapas quando algo falta", () => {
			const wm = makeWorkingMemory();
			wm.checklist.ideation.businessName = null;
			wm.checklist.planning.persona.name = null;
			const errors = validateFullChecklist(wm);
			expect(errors.some((e) => e.field === "businessName")).toBe(true);
			expect(errors.some((e) => e.field === "persona.name")).toBe(true);
		});
	});

	describe("getStageForArtifactType / getNextStage", () => {
		it("mapeia artifact types -> stages", () => {
			expect(getStageForArtifactType("business_profile")).toBe(
				"ideation",
			);
			expect(getStageForArtifactType("agent_blueprint")).toBe("planning");
			expect(getStageForArtifactType("knowledge_base")).toBe("knowledge");
			expect(getStageForArtifactType("final_summary")).toBe("creation");
		});

		it("avanca etapas em ordem ideation -> planning -> knowledge -> creation -> null", () => {
			expect(getNextStage("ideation")).toBe("planning");
			expect(getNextStage("planning")).toBe("knowledge");
			expect(getNextStage("knowledge")).toBe("creation");
			expect(getNextStage("creation")).toBe(null);
		});
	});

	describe("buildArtifactContent", () => {
		const wm = makeWorkingMemory();

		it("business_profile consolida ideation", () => {
			const c = buildArtifactContent("business_profile", wm) as {
				businessName: string;
				targetAudience: string;
				goalForAgent: string;
			};
			expect(c.businessName).toBe("Clínica Teste");
			expect(c.targetAudience).toBe("Mulheres 30-55");
			expect(c.goalForAgent).toBe("Agendar consultas");
		});

		it("agent_blueprint consolida planning com gender uppercase", () => {
			const c = buildArtifactContent("agent_blueprint", wm) as {
				persona: { name: string; gender: string };
				salesTechniques: Array<{ presetId: string }>;
			};
			expect(c.persona.name).toBe("Ana");
			expect(c.persona.gender).toBe("FEMININE");
			expect(c.salesTechniques[0]?.presetId).toBe("rapport");
		});

		it("knowledge_base lista documentIds", () => {
			const c = buildArtifactContent("knowledge_base", wm) as {
				documents: Array<{ id: string }>;
			};
			expect(c.documents.length).toBe(2);
			expect(c.documents[0]?.id).toBe("doc_1");
		});

		it("final_summary consolida tudo (nome, role, doc count)", () => {
			const c = buildArtifactContent("final_summary", wm) as {
				agentName: string;
				role: string;
				knowledgeDocCount: number;
			};
			expect(c.agentName).toBe("Ana");
			expect(c.role).toBe("Agendar consultas");
			expect(c.knowledgeDocCount).toBe(2);
		});
	});

	describe("computeDiff", () => {
		it("retorna [] quando objetos são iguais", () => {
			expect(computeDiff({ a: 1 }, { a: 1 })).toEqual([]);
		});

		it("detecta campo alterado", () => {
			const diff = computeDiff({ a: 1, b: 2 }, { a: 1, b: 3 });
			expect(diff).toEqual([{ field: "b", before: 2, after: 3 }]);
		});

		it("detecta campo removido / adicionado", () => {
			const diff = computeDiff({ a: 1 }, { b: 2 });
			expect(diff.some((d) => d.field === "a")).toBe(true);
			expect(diff.some((d) => d.field === "b")).toBe(true);
		});

		it("compara nested objects via JSON.stringify", () => {
			const before = { persona: { name: "Ana", tone: 50 } };
			const after = { persona: { name: "Ana", tone: 60 } };
			const diff = computeDiff(before, after);
			expect(diff.length).toBe(1);
			expect(diff[0]?.field).toBe("persona");
		});
	});

	describe("deriveToolsFromCapabilities", () => {
		it("qualification -> updateLeadData + moveLeadStage", () => {
			const tools = deriveToolsFromCapabilities(["qualification"]);
			expect(tools).toContain("updateLeadData");
			expect(tools).toContain("moveLeadStage");
		});

		it("capabilities vazias -> []", () => {
			expect(deriveToolsFromCapabilities([])).toEqual([]);
		});

		it("deduplica quando múltiplas capabilities compartilham tool", () => {
			const tools = deriveToolsFromCapabilities([
				"qualification",
				"qualification",
			]);
			const uniqueCount = new Set(tools).size;
			expect(uniqueCount).toBe(tools.length);
		});
	});
});

describe("architectTools — errors (story 08A.3)", () => {
	describe("ArchitectToolError", () => {
		it("carrega code + message + details", () => {
			const err = new ArchitectToolError(
				"CHECKLIST_INCOMPLETE",
				"Faltando campos",
				[{ field: "businessName" }],
			);
			expect(err.code).toBe("CHECKLIST_INCOMPLETE");
			expect(err.message).toBe("Faltando campos");
			expect(err.details).toEqual([{ field: "businessName" }]);
		});

		it("toFailure() retorna shape estruturado", () => {
			const err = new ArchitectToolError("DOCUMENT_NOT_FOUND", "x");
			const failure = err.toFailure();
			expect(failure.success).toBe(false);
			expect(failure.error).toBe("DOCUMENT_NOT_FOUND");
			expect(failure.message).toBe("x");
		});
	});

	describe("toFailure mapper", () => {
		it("converte ArchitectToolError em failure com code", () => {
			const failure = toFailure(
				new ArchitectToolError("ARTIFACT_LOCKED", "lock"),
			);
			expect(failure.error).toBe("ARTIFACT_LOCKED" as ArchitectErrorCode);
		});

		it("converte Error genérico em PUBLISH_FAILED", () => {
			const failure = toFailure(new Error("something broke"));
			expect(failure.error).toBe("PUBLISH_FAILED");
			expect(failure.message).toContain("something broke");
		});

		it("converte string lançada em PUBLISH_FAILED", () => {
			const failure = toFailure("uh oh");
			expect(failure.error).toBe("PUBLISH_FAILED");
			expect(failure.message).toContain("uh oh");
		});
	});
});
