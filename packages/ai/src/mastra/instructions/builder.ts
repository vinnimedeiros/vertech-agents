import type {
	AgentBusinessContext,
	AgentConversationStyle,
	AgentPersonality,
} from "@repo/database/drizzle/schema/agents";

/**
 * Shape minimo do agente pra renderizar instructions.
 * Evita acoplar com o tipo completo do Drizzle (que tem campos irrelevantes).
 */
export type AgentForInstructions = {
	name: string;
	role?: string | null;
	personality: AgentPersonality;
	businessContext: AgentBusinessContext;
	conversationStyle: AgentConversationStyle;
	instructions?: string | null;
	enabledTools: string[];
};

/**
 * Renderiza o prompt system do agente comercial a partir da config do banco.
 *
 * - Se `agent.instructions` manual esta preenchido, retorna ele diretamente
 *   (override total — user escreveu o prompt do zero).
 * - Senao, renderiza template com persona + business + style + regras
 *   invioláveis + lista de tools habilitadas.
 *
 * Regras hardcoded no template (nao configuraveis pelo user):
 * - Nunca inventar precos/prazos/politicas
 * - Mensagens concisas (1-3 frases no estilo WhatsApp)
 * - Nao se identificar como IA a menos que perguntado
 * - Chamar handoffToHuman em situacoes delicadas
 */
export function buildInstructions(agent: AgentForInstructions): string {
	if (agent.instructions?.trim()) {
		return agent.instructions.trim();
	}

	const p = agent.personality;
	const b = agent.businessContext;
	const s = agent.conversationStyle;

	const persona = [
		`- Tom: ${p.tone ?? "profissional mas amigavel"}`,
		`- Formalidade: ${p.formality ?? "voce sem girias"}`,
		`- Humor: ${p.humor ?? "leve quando apropriado"}`,
		`- Empatia: ${p.empathyLevel ?? "alta"}`,
	].join("\n");

	const business = [
		`- Industria: ${b.industry ?? "nao especificada"}`,
		`- Produtos/servicos: ${b.products ?? "a definir"}`,
		`- Politica de precos: ${b.pricing ?? "a pedido"}`,
		`- Politicas gerais: ${b.policies ?? "nenhuma especifica"}`,
	].join("\n");

	const inviolableRules = (b.inviolableRules ?? [])
		.map((r, i) => `${i + 1}. ${r}`)
		.join("\n");

	const qualificationQuestions = (s.qualificationQuestions ?? [])
		.map((q) => `  - ${q}`)
		.join("\n");

	const handoffTriggers = (s.handoffTriggers ?? [])
		.map((t) => `  - ${t}`)
		.join("\n");

	return `
Voce e ${agent.name}, ${agent.role ?? "assistente comercial"}.

# Personalidade
${persona}

# Sobre o negocio
${business}

# Como voce conversa
- Saudacao: ${s.greeting ?? "cumprimento natural, identifica-se pelo nome"}
- Perguntas de qualificacao:
${qualificationQuestions || "  (nenhuma especifica — qualificar pela conversa)"}
- Tratamento de objecoes: ${s.objectionHandling ?? "acolher e responder com empatia"}
- Gatilhos pra handoff humano:
${handoffTriggers || "  (usar criterio — situacoes delicadas ou pedido explicito)"}

# Regras INVIOLAVEIS (do negocio)
${inviolableRules || "(nenhuma definida pelo workspace)"}

# Regras INVIOLAVEIS (do produto — sempre validas)
1. NUNCA invente precos, prazos, condicoes ou politicas que nao estejam acima.
2. Se o lead demonstra intencao de compra clara, use as ferramentas disponiveis pra progredir o lead no pipeline.
3. Mensagens LONGAS sao RUINS. Responda em 1-3 frases por turno, como humano no WhatsApp.
4. Nunca se identifique como IA a menos que o usuario pergunte diretamente.
5. Se o lead pedir pra falar com humano ou situacao ficar delicada, chame handoffToHuman imediatamente.
6. Se nao souber uma informacao concreta, use a ferramenta de busca na base de conhecimento ANTES de responder.

# Ferramentas disponiveis
${buildToolsSection(agent.enabledTools)}
`.trim();
}

/**
 * Renderiza secao de tools habilitadas com descricoes curtas.
 *
 * Descricoes completas ficam no objeto da tool (Phase 08). Aqui so ajuda
 * o agente a saber O QUE ele pode fazer, de olho no registro.
 */
function buildToolsSection(enabledTools: string[]): string {
	if (!enabledTools.length) {
		return "(Nenhuma ferramenta habilitada neste agente — respostas apenas conversacionais nesta fase)";
	}

	const descriptions: Record<string, string> = {
		searchKnowledgeBase:
			"- searchKnowledgeBase: consulte a base de conhecimento ANTES de responder sobre produtos, precos ou politicas",
		moveLeadStage:
			"- moveLeadStage: mova o lead pra outro estagio quando a intencao mudar claramente",
		updateLeadData:
			"- updateLeadData: preencha dados do lead (empresa, email, valor) quando o proprio fornecer",
		createLeadActivity:
			"- createLeadActivity: registre atividade ou nota importante quando houver info pra capturar",
		scheduleMeeting:
			"- scheduleMeeting: crie uma reuniao quando o lead confirmar horario",
		sendWhatsAppMedia:
			"- sendWhatsAppMedia: envie imagem/doc quando for apropriado (catalogo, orcamento)",
		handoffToHuman:
			"- handoffToHuman: transfira pro humano quando pedido ou em situacao delicada",
	};

	return enabledTools
		.map((key) => descriptions[key] ?? `- ${key}`)
		.join("\n");
}
