import { Agent } from "@mastra/core/agent";
import { agent as agentTable, db, eq } from "@repo/database";
import { getAtendenteModeInstructions } from "../instructions/atendente-modes";
import { buildInstructions } from "../instructions/builder";
import { getLogger } from "../logger";
import { getCommercialAgentMemory } from "../memory/config";
import { commercialTools } from "../tools/commercial";
import { getTeamMembers } from "./team-members";

const log = getLogger("agents/commercial");

/**
 * Atendente — Supervisor do TIME comercial Vertech V3.
 *
 * Multi-tenant via `requestContext.agentId` (lê config do banco em runtime).
 * **Supervisor Pattern Mastra** (M1-02 do Roadmap V3): estrutura pronta pra
 * delegar pra sub-agents adicionados em M2-03 (Analista), M2-04 (Campanhas)
 * e M2-05 (Assistente). Em M1-02 stub `getTeamMembers()` retorna `{}`,
 * Atendente opera solo.
 *
 * Lazy init via `getCommercialAgent()` — permite importar o package em
 * contextos sem DATABASE_URL (testes, static analysis).
 *
 * `requestContext` populado pelo runtime invoker com:
 * - agentId: string
 * - organizationId: string
 * - conversationId: string
 * - contactId: string
 * - whatsappInstanceId: string | null
 *
 * Refs: docs/PROJECT-ROADMAP-V3.md (M1-02), team-members.ts, Mastra Supervisor
 * Pattern (https://mastra.ai/docs/agents/supervisor-agents).
 */
let agentInstance: Agent | null = null;

export function getCommercialAgent(): Agent {
	if (!agentInstance) {
		agentInstance = new Agent({
			id: "commercial-agent",
			name: "Atendente (Supervisor)",
			description:
				"Atendente comercial Vertech — Supervisor do TIME. Conversa com leads via WhatsApp e coordena Analista/Campanhas/Assistente quando necessário.",

			model: async ({ requestContext }) => {
				const agentId = requestContext?.get?.("agentId") as string | undefined;
				if (!agentId) return "openai/gpt-4.1-mini" as never;
				const record = await loadAgentFromContext(requestContext);
				return record.model as never;
			},

			instructions: async ({ requestContext }) => {
				const agentId = requestContext?.get?.("agentId") as string | undefined;
				if (!agentId) {
					return "Atendente Supervisor do TIME comercial Vertech. Configurar `requestContext.agentId` em runtime pra resolver model/instructions/tools do banco.";
				}
				const record = await loadAgentFromContext(requestContext);
				const base = buildInstructions(record);

				// M2-01: injeta bloco do modo contextual (SDR/closer/pós-venda).
				// Modo vem de requestContext.atendenteMode OU é inferido do stage.
				const mode = requestContext?.get?.("atendenteMode") as
					| string
					| undefined;
				const modeBlock = getAtendenteModeInstructions(mode);

				return modeBlock ? `${base}\n\n${modeBlock}` : base;
			},

			tools: async ({ requestContext }) => {
				const agentId = requestContext?.get?.("agentId") as string | undefined;
				if (!agentId) return {};
				const isSandbox = Boolean(requestContext?.get?.("isSandbox"));
				const record = await loadAgentFromContext(requestContext);

				// M2-02: em sandbox OU quando enabledTools vazio (agente legacy),
				// expõe TODAS atendenteTools. Caso contrário, filtra por configuração.
				if (isSandbox || record.enabledTools.length === 0) {
					const all = commercialTools as Record<string, unknown>;
					log.debug({ sandbox: isSandbox, count: Object.keys(all).length, tools: Object.keys(all) }, "Atendente tools resolvidas");
					return all as never;
				}
				const filtered = filterTools(record.enabledTools);
				log.debug({ count: Object.keys(filtered).length, mode: "enabledTools filter" }, "Atendente tools resolvidas");
				return filtered;
			},

			memory: getCommercialAgentMemory(),

			// Sub-agents do TIME (vazios em M1-02 stub, populados em M2-03/04/05).
			// Quando preenchidos, Mastra descobre e Atendente delega via `description`
			// de cada sub-agent + `instructions` do Atendente que mencionam o time.
			agents: getTeamMembers(),

			// Iteration limit anti-loop (R2 mitigation — multi-agent failure 41-86%).
			// 10 steps cobre delegação típica (Atendente → 1-2 sub-agents → resposta).
			defaultOptions: {
				maxSteps: 10,
			},
		});
	}
	return agentInstance;
}

type RequestContextLike = {
	get: (key: string) => unknown;
};

async function loadAgentFromContext(requestContext: RequestContextLike) {
	const agentId = requestContext.get("agentId") as string | undefined;
	if (!agentId) {
		throw new Error("requestContext.agentId e obrigatorio");
	}

	const row = await db.query.agent.findFirst({
		where: eq(agentTable.id, agentId),
	});

	if (!row) {
		throw new Error(`Agent ${agentId} nao encontrado no banco`);
	}

	return row;
}

/**
 * Filtra o registry de tools pelas chaves habilitadas no agente (M2-01).
 * Registry populado em `tools/atendente/index.ts` com 11 tools core.
 */
function filterTools(enabledKeys: string[]) {
	const registry = commercialTools as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	for (const key of enabledKeys) {
		if (key in registry) {
			out[key] = registry[key];
		}
	}
	return out as never;
}
