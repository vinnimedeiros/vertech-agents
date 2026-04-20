import type { ArchitectTemplate } from "./types";

export const INFO_PRODUCT_TEMPLATE: ArchitectTemplate = {
	id: "info_product",
	label: "Infoprodutor",
	industry: "educação online",
	emoji: "💼",
	promptInjection: `
Este é um template de infoprodutor (curso online, mentoria, coaching, consultoria).

Perguntas-chave específicas pra explorar na Ideação:
- Transformação que o produto entrega (antes/depois)
- Público-alvo específico (nicho, dor, estágio)
- Formato (curso gravado, ao vivo, mentoria, grupo)
- Preço e garantia
- Provas sociais (alunos, cases, certificações)
- Canais de venda (launch, evergreen, webinar)
- Principais objeções que costuma ouvir

Presets de técnicas comerciais sugeridos:
- AIDA (atenção → desejo → ação)
- PAS (problema → agitação → solução)
- Objeção (preço, tempo, "vou ver depois")
- Follow-up (carrinho, lista de espera)

Persona padrão sugerida:
- Tom: empático-motivacional (65-80/100)
- Formalidade: baixa (30-45/100)
- Humor: moderado (40-55/100)
- Empatia: alta (75-90/100)
- Anti-patterns: nunca prometer resultado garantido, nunca inventar depoimentos, nunca pressionar com escassez falsa

Emojis sugeridos: ✨ 🚀 💡 🎯 (moderado, combinar com tom)

Capabilities essenciais:
- Qualificação (entender objetivo e estágio do lead)
- FAQ (conteúdo, prazo de acesso, garantia)
- Objeção (responder dúvidas de compra)
- Follow-up (lista de espera, carrinho, pós-compra)
`.trim(),
};
