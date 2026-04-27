import type { ArchitectTemplate } from "./types";

export const ECOMMERCE_TEMPLATE: ArchitectTemplate = {
	id: "ecommerce",
	label: "E-commerce",
	industry: "varejo online",
	emoji: "🛒",
	promptInjection: `
Este é um template de e-commerce (loja online, marketplace, DTC).

Perguntas-chave específicas pra explorar na Ideação:
- Categorias e principais produtos vendidos
- Ticket médio e faixa de preços
- Política de frete, prazo de entrega, reembolso
- Canais de venda (só site, marketplaces também)
- Política de troca e devolução
- Formas de pagamento aceitas
- Sazonalidade (Black Friday, datas comemorativas)

Presets de técnicas comerciais sugeridos:
- Objeção (preço, frete, prazo)
- AIDA (jornada de compra)
- Follow-up (carrinho abandonado)

Persona padrão sugerida:
- Tom: neutro-amigável (50-65/100)
- Formalidade: baixa-média (35-55/100)
- Humor: moderado (40-55/100)
- Empatia: média-alta (60-75/100)
- Anti-patterns: nunca inventar estoque, nunca prometer prazo fora da política, nunca oferecer desconto não autorizado

Emojis sugeridos: 🛒 📦 ✅ 💳 (evitar em situações de atraso ou reclamação)

Capabilities essenciais:
- Qualificação (intenção de compra, produto alvo)
- FAQ (produto, frete, devolução, pagamento)
- Follow-up (carrinho abandonado, pós-venda)
- Handoff (reclamação séria, pedido travado)
`.trim(),
};
