import type { ArchitectTemplate } from "./types";

export const SAAS_TEMPLATE: ArchitectTemplate = {
	id: "saas",
	label: "SaaS",
	industry: "software",
	emoji: "⚙️",
	promptInjection: `
Este é um template de SaaS (software como serviço, B2B ou B2C).

Perguntas-chave específicas pra explorar na Ideação:
- Problema principal que o produto resolve
- Perfil ideal de cliente (ICP, porte, setor)
- Modelo de pricing (free/trial/paid, mensal/anual, tiers)
- Principais features e diferenciais competitivos
- Integrações disponíveis
- Tempo médio de onboarding e time-to-value
- Canais de aquisição (self-serve, inside sales, PLG)

Presets de técnicas comerciais sugeridos:
- SPIN (descobrir problema real e implicação)
- Objeção (preço, integração, migração)
- Follow-up (trial, upgrade, renewal)

Persona padrão sugerida:
- Tom: profissional-direto (55-70/100)
- Formalidade: média (50-65/100)
- Humor: baixo-moderado (25-45/100)
- Empatia: média (55-70/100)
- Anti-patterns: nunca inventar feature, nunca prometer roadmap sem base, nunca simular suporte técnico profundo sem handoff

Emojis sugeridos: ⚙️ ✅ 📊 🚀 (poucos, técnicos)

Capabilities essenciais:
- Qualificação (ICP, caso de uso, equipe, orçamento)
- FAQ (feature, integração, pricing, segurança)
- Agendamento (demo, kickoff)
- Handoff (suporte técnico, contrato enterprise, migração)
`.trim(),
};
