import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { getArchitectTemplate } from "../templates";
import {
	type AgentBlueprintExtract,
	type BusinessProfileExtract,
	type KnowledgeBaseExtract,
	agentBlueprintExtractSchema,
	businessProfileExtractSchema,
	knowledgeBaseExtractSchema,
} from "./schemas";

/**
 * Extractor LLM secundário do Arquiteto (story 09.5 refactor,
 * arquitetura extractor-driven).
 *
 * Roda após cada turno completo do main LLM. Lê as últimas mensagens da
 * conversa + vertical template + stage atual, e produz (via structured
 * output) o content do artifact daquela etapa.
 *
 * Uso:
 * ```
 * const content = await extractArchitectArtifact({
 *   stage: 'ideation', templateId: 'clinical', messages
 * })
 * if (content) { upsert agent_artifact }
 * ```
 *
 * Retorna null se a conversa ainda não tem info suficiente. Caller
 * decide se mantém o artifact existente ou não faz nada.
 */
export type ExtractorMessage = {
	role: "user" | "assistant";
	content: string;
};

export type ExtractorInput = {
	stage: "ideation" | "planning" | "knowledge";
	templateId: string;
	messages: ExtractorMessage[];
};

export type ExtractorResult =
	| {
			stage: "ideation";
			content: BusinessProfileExtract;
			hasMinimumData: boolean;
	  }
	| {
			stage: "planning";
			content: AgentBlueprintExtract;
			hasMinimumData: boolean;
	  }
	| {
			stage: "knowledge";
			content: KnowledgeBaseExtract;
			hasMinimumData: boolean;
	  };

const EXTRACTOR_MODEL = openai("gpt-4o-mini");

export async function extractArchitectArtifact(
	input: ExtractorInput,
): Promise<ExtractorResult | null> {
	if (input.messages.length === 0) return null;

	const template = getArchitectTemplate(input.templateId);
	const conversation = formatConversation(input.messages);

	if (input.stage === "ideation") {
		const { object } = await generateObject({
			model: EXTRACTOR_MODEL,
			schema: businessProfileExtractSchema,
			prompt: buildIdeationPrompt(template.label, conversation),
		});
		const hasMinimumData =
			!!object.businessName &&
			!!object.targetAudience &&
			(!!object.goalForAgent || object.offering.length > 0);
		return { stage: "ideation", content: object, hasMinimumData };
	}

	if (input.stage === "planning") {
		const { object } = await generateObject({
			model: EXTRACTOR_MODEL,
			schema: agentBlueprintExtractSchema,
			prompt: buildPlanningPrompt(template.label, conversation),
		});
		const hasMinimumData =
			!!object.persona.name &&
			object.persona.tone !== null &&
			object.capabilities.length > 0;
		return { stage: "planning", content: object, hasMinimumData };
	}

	if (input.stage === "knowledge") {
		const { object } = await generateObject({
			model: EXTRACTOR_MODEL,
			schema: knowledgeBaseExtractSchema,
			prompt: buildKnowledgePrompt(template.label, conversation),
		});
		const hasMinimumData = Object.keys(object.domainAnswers).length > 0;
		return { stage: "knowledge", content: object, hasMinimumData };
	}

	return null;
}

function formatConversation(messages: ExtractorMessage[]): string {
	return messages
		.map((m) => {
			const role = m.role === "user" ? "USUÁRIO" : "ARQUITETO";
			return `${role}: ${m.content}`;
		})
		.join("\n\n");
}

function buildIdeationPrompt(templateLabel: string, conversation: string) {
	return `
Você é um extrator. Leia a conversa entre um ARQUITETO (consultor de IA) e um USUÁRIO (dono de negócio do vertical ${templateLabel}) e extraia os dados do negócio que o usuário contou.

REGRAS:
- Extraia apenas o que o USUÁRIO disse, não invente nada
- Se o usuário não mencionou um campo, use null (ou array vazio se for lista)
- Não infira informação — se o usuário não disse o nome da empresa, deixe null

CAMPOS:
- businessName: nome da empresa/negócio do usuário
- summary: resumo curto (1 frase) do que o negócio faz
- offering: lista de produtos/serviços oferecidos
- targetAudience: quem é o cliente-alvo
- goalForAgent: pra quê o agente vai ser usado (qualificar leads / agendar / responder FAQ etc)
- differentiator: diferencial competitivo se mencionado
- industry: vertical/setor

CONVERSA:
${conversation}
`.trim();
}

function buildPlanningPrompt(templateLabel: string, conversation: string) {
	return `
Você é um extrator. Leia a conversa entre um ARQUITETO (consultor de IA) e um USUÁRIO (dono de negócio do vertical ${templateLabel}) e extraia as decisões de persona do agente que serão implementadas.

REGRAS:
- Extraia o que foi CONFIRMADO ou PROPOSTO PELO ARQUITETO (se o usuário não objetou, considere aceito)
- Valores numéricos: se não foi mencionado número exato, infira do tom qualitativo (ex: "caloroso" = 75, "formal" = 30)
- Arrays vazios se nada foi mencionado

CAMPOS persona:
- name: nome da agente (ex: "Sofia", "Ana")
- gender: FEMININE ou MASCULINE
- tone: 0 (formal/seco) até 100 (descontraído/caloroso)
- formality: 0 (formal rígido) até 100 (você/girias)
- humor: 0 (sem humor) até 100 (descontraído)
- empathy: 0 (baixa) até 100 (alta)
- antiPatterns: lista de coisas que o agente NUNCA deve fazer

CAMPOS salesTechniques: array com presetId (rapport/spin/aida/pas/objection/followup) + intensity (soft/balanced/aggressive)
CAMPOS emojiConfig: mode (none/curated/free) + curatedList (emojis se modo curated)
CAMPOS voiceConfig: enabled boolean
CAMPOS capabilities: array (qualification, scheduling, faq, handoff, followup)

CONVERSA:
${conversation}
`.trim();
}

function buildKnowledgePrompt(templateLabel: string, conversation: string) {
	return `
Você é um extrator. Leia a conversa entre um ARQUITETO (consultor de IA) e um USUÁRIO (dono de negócio do vertical ${templateLabel}) sobre os materiais de conhecimento do agente.

REGRAS:
- additionalNotes: notas livres que o usuário mencionou sobre conhecimento extra
- domainAnswers: perguntas de domínio + respostas do usuário. Chave = pergunta, valor = resposta do usuário.

CONVERSA:
${conversation}
`.trim();
}
