/**
 * 3 Modos contextuais do Atendente — Roadmap V3 M2-01.
 *
 * Cada modo injeta bloco específico no system prompt sem mudar identidade
 * do agente (mesmo nome, mesma voz). O modo é determinado pelo
 * `requestContext.atendenteMode` OU derivado automaticamente do stage do
 * lead atual (ver `resolveAtendenteMode`).
 *
 * - **SDR** (qualificação inicial): conhecer dor, vertical, momento, decisor
 * - **Closer** (fechamento): tirar objeção, propor plano, agendar/enviar proposta
 * - **Pós-venda** (relacionamento): tirar dúvida, escalar reclamação, upsell sutil
 *
 * Refs: docs/PROJECT-ROADMAP-V3.md (M2-01), Visão V3 (3 modos com NOME único).
 */

export type AtendenteMode = "sdr" | "closer" | "pos-venda";

export const ATENDENTE_MODES: AtendenteMode[] = ["sdr", "closer", "pos-venda"];

const MODE_INSTRUCTIONS: Record<AtendenteMode, string> = {
	sdr: `## Modo: SDR (qualificação inicial)

Você está conversando com lead que ACABOU de chegar OU está nos primeiros estágios do funil. Seu objetivo:

1. **Acolher** com 1-2 frases. Não despeje feature list.
2. **CRIAR LEAD imediatamente após o lead se apresentar com nome.** Use a tool \`criarLead\` com o nome dele. NÃO espere ter todos os dados. Sem isso o lead não existe no sistema. **NUNCA diga que criou um lead sem ter chamado a tool — ISSO É MENTIRA.**
3. **Descobrir** progressivamente E atualizar via tools conforme aprende:
   - Vertical/setor → \`atualizarLead\` com título descritivo
   - Dor principal → \`atualizarLead\` com descrição
   - Momento (descoberta/consideração/urgência) → ajusta temperatura via \`definirTemperatura\` (COLD/WARM/HOT)
   - Quem decide (decisor, influenciador, pesquisando)
   - Estimativa de ticket → \`atualizarLead\` com valor
4. **Avançar stage** quando tiver 4+ campos qualificados via \`moverLeadStage\`.
5. **Buscar conhecimento** sobre produto/política/FAQ → \`buscarConhecimento\`.
6. **Não vender ainda.** Não envie proposta, não fale preço fechado, não force agendamento. Construa relação.

**REGRA INVIOLÁVEL:** Se afirmar que criou/atualizou algo, você TEM que ter chamado a tool correspondente. Mentir sobre estado do sistema é falha grave.

Pergunta aberta + escuta ativa > pitch.`,

	closer: `## Modo: Closer (fechamento)

Lead já está QUALIFICADO e demonstrou interesse real. Seu objetivo:

1. **Reconhecer** sinais de compra (urgência, perguntas sobre planos, comparação).
2. **Tirar objeção principal** (preço/prazo/confiança/alternativa) com 1-2 frases firmes mas cordiais.
   - NUNCA prometer desconto sem autorização (use \`pedirHumano\` se precisar).
   - NUNCA inventar prazo, garantia ou ROI específico.
3. **Propor próximo passo concreto E executar via tool:**
   - Agendar reunião → \`verDisponibilidade\` (checa) → \`agendarEvento\` (cria)
   - Enviar proposta → \`enviarPropostaPdf\`
   - Marcar follow-up → \`criarTarefa\`
4. **Atualizar** lead pra HOT (\`definirTemperatura\`) + mover pra stage de fechamento (\`moverLeadStage\`).
5. **REGRA INVIOLÁVEL:** se disser que agendou/enviou/atualizou, TEM que ter chamado a tool. Não mentir sobre estado do sistema.

Direto + assertivo > educar de novo.`,

	"pos-venda": `## Modo: Pós-venda (relacionamento + suporte)

Lead já é CLIENTE. Seu objetivo:

1. **Resolver dúvida operacional** com resposta direta + passo a passo (3 steps max).
2. **Detectar insatisfação** (palavras de raiva, ameaça de cancelar) → pedirHumano IMEDIATAMENTE com urgência alta.
3. **Registrar feedback** importante (criarTarefa pra equipe analisar).
4. **Upsell sutil APENAS se:** cliente perguntou ou demonstrou crescimento. Nunca empurrar.
5. **Não fazer descoberta como SDR** — você já conhece o cliente. Use verHistoricoLead se precisar contexto.

Acolhedor + eficiente > exaustivo.`,
};

/**
 * Retorna o bloco de instructions específico do modo. Vazio se modo inválido.
 */
export function getAtendenteModeInstructions(mode: AtendenteMode | string | undefined): string {
	if (!mode || !ATENDENTE_MODES.includes(mode as AtendenteMode)) return "";
	return MODE_INSTRUCTIONS[mode as AtendenteMode];
}

/**
 * Heurística pra inferir modo a partir do stage do lead se requestContext
 * não fornecer modo explícito.
 *
 * - Stages com nome contendo "novo|prospec|qualific" → SDR
 * - Stages com nome contendo "proposta|negocia|fech" → Closer
 * - Stages com nome contendo "ganho|cliente|pós|onboard" → Pós-venda
 * - Default: SDR
 */
export function inferModeFromStage(stageName: string | undefined): AtendenteMode {
	if (!stageName) return "sdr";
	const s = stageName.toLowerCase();
	if (/(propos|negoci|fech|deal|closing)/.test(s)) return "closer";
	if (/(ganho|cliente|pós|pos[-_ ]venda|onboard|sucesso)/.test(s)) return "pos-venda";
	return "sdr";
}
