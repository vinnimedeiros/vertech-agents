import { Agent } from "@mastra/core/agent";
import {
	agentCreationSession,
	and,
	db,
	eq,
	knowledgeDocument,
} from "@repo/database";
import {
	buildArchitectInstructions,
	type UploadedDocumentContext,
} from "../instructions/architect";
import { getArchitectAgentMemory } from "../memory/architect";
import { architectTools } from "../tools/architect";

/**
 * Agente Arquiteto Construtor (story 09.5).
 *
 * Único agente que cria e evolui outros agentes da plataforma. Model forte
 * (`openai/gpt-4o`, tech-spec § 1.1) justificado pelo raciocínio estruturado
 * de conversa guiada + geração de artefatos.
 *
 * Registry isolado (ADR-001): usa `architectTools` exclusivamente. Nunca
 * invoca tools do Commercial ou do Orchestrator.
 *
 * `requestContext` populado pelo route handler `/api/architect/chat`:
 * - sessionId: id da agent_creation_session (= thread da Memory)
 * - userId: id do usuário logado (= resource da Memory)
 * - organizationId: id da org (tenant isolation)
 * - templateId: id do vertical (ex: 'clinical')
 * - attachmentIds: ids de knowledge_document anexados nesta msg (opcional)
 *
 * Lazy init — mantém consistência com Commercial Agent e evita side effects.
 */
let agentInstance: Agent | null = null;

type ArchitectRequestContext = { get: (key: string) => unknown };

export function getArchitectAgent(): Agent {
	if (!agentInstance) {
		agentInstance = new Agent({
			id: "architect-agent",
			name: "Architect Agent",
			description:
				"Agente Arquiteto Construtor do Vertech — guia dono de negócio a criar um agente comercial através de conversa estruturada em 4 etapas.",

			model: "openai/gpt-4o",

			instructions: async ({ requestContext }) => {
				return await buildArchitectInstructionsFromContext(
					requestContext as ArchitectRequestContext | undefined,
				);
			},

			tools: architectTools,

			memory: getArchitectAgentMemory(),
		});
	}
	return agentInstance;
}

async function buildArchitectInstructionsFromContext(
	requestContext: ArchitectRequestContext | undefined,
): Promise<string> {
	const sessionId = requestContext?.get?.("sessionId") as string | undefined;
	const templateIdFromCtx = requestContext?.get?.("templateId") as
		| string
		| undefined;
	const stageFromCtx = requestContext?.get?.("currentStage") as
		| string
		| undefined;

	let templateId = templateIdFromCtx ?? "custom";
	let currentStage: "ideation" | "planning" | "knowledge" | "creation" =
		(stageFromCtx as
			| "ideation"
			| "planning"
			| "knowledge"
			| "creation"
			| undefined) ?? "ideation";
	let uploadedDocuments: UploadedDocumentContext[] = [];
	let checklist: unknown = null;

	if (sessionId) {
		const session = await db.query.agentCreationSession.findFirst({
			where: and(
				eq(agentCreationSession.id, sessionId),
				eq(agentCreationSession.status, "DRAFT"),
			),
		});

		if (session) {
			templateId = templateIdFromCtx ?? session.templateId;
			currentStage =
				(session.draftSnapshot?.currentStage as typeof currentStage) ??
				currentStage;
			checklist = session.draftSnapshot ?? null;

			const docs = await db.query.knowledgeDocument.findMany({
				where: eq(knowledgeDocument.sessionId, sessionId),
				columns: {
					id: true,
					title: true,
					status: true,
				},
			});

			uploadedDocuments = docs.map((d) => ({
				id: d.id,
				fileName: d.title,
				status: d.status,
			}));
		}
	}

	return buildArchitectInstructions({
		templateId,
		currentStage,
		checklist,
		uploadedDocuments,
	});
}
