/**
 * Mapeia categoria do WhatsApp Business (retornada pelo Baileys em inglês)
 * pra PT-BR. Aceita tanto enum ("OTHER_BUSINESS") quanto formato humano
 * ("Other Business") — normaliza antes de comparar.
 */
const CATEGORY_PT_BR: Record<string, string> = {
	AUTO_DEALERS_AND_SERVICING: "Automotivo",
	APPAREL_AND_CLOTHING: "Vestuário",
	BEAUTY_AND_SPA: "Beleza e estética",
	BOOK_STORE: "Livraria",
	CLOTHING_AND_APPAREL: "Vestuário",
	CLOTHING: "Vestuário",
	EDUCATION: "Educação",
	ENTERTAINMENT: "Entretenimento",
	EVENT_PLANNING_AND_SERVICE: "Eventos",
	FINANCE_AND_BANKING: "Finanças",
	FOOD_AND_GROCERY: "Alimentação",
	FOOD: "Alimentação",
	GROCERY: "Mercearia",
	HEALTH_AND_MEDICAL: "Saúde",
	HEALTH: "Saúde",
	HOME_IMPROVEMENT: "Construção e reforma",
	HOTEL: "Hotéis",
	NONPROFIT: "ONG",
	ORGANIZATION: "Organização",
	PROFESSIONAL_SERVICES: "Serviços profissionais",
	RESTAURANT: "Restaurante",
	SHOPPING_AND_RETAIL: "Varejo",
	SHOPPING: "Compras",
	TRAVEL_AND_TRANSPORTATION: "Viagem e transporte",
	TRAVEL: "Viagem",
	OTHER_BUSINESS: "Outros",
	OTHER: "Outros",
	OTHERS: "Outros",
};

export function translateBusinessCategory(
	raw: string | null | undefined,
): string {
	if (!raw) return "";
	const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
	return CATEGORY_PT_BR[key] ?? raw;
}
