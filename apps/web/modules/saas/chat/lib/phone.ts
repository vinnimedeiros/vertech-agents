/**
 * Formata um telefone brasileiro. Aceita números sem formatação e com DDI.
 *  "5511911848624" → "+55 11 91184-8624"
 *  "11911848624"   → "+55 11 91184-8624"
 *  "999999999"     → "999999999" (retorna cru se não reconhecido)
 */
export function formatPhoneBR(raw: string | null | undefined): string {
	if (!raw) return "";
	const digits = raw.replace(/\D/g, "");

	// 13 dígitos = DDI(2) + DDD(2) + 9 dígitos
	if (digits.length === 13 && digits.startsWith("55")) {
		const ddi = digits.slice(0, 2);
		const ddd = digits.slice(2, 4);
		const first = digits.slice(4, 9);
		const last = digits.slice(9, 13);
		return `+${ddi} ${ddd} ${first}-${last}`;
	}

	// 12 dígitos = DDI(2) + DDD(2) + 8 dígitos (fixo)
	if (digits.length === 12 && digits.startsWith("55")) {
		const ddi = digits.slice(0, 2);
		const ddd = digits.slice(2, 4);
		const first = digits.slice(4, 8);
		const last = digits.slice(8, 12);
		return `+${ddi} ${ddd} ${first}-${last}`;
	}

	// 11 dígitos = DDD + 9 dígitos (sem DDI)
	if (digits.length === 11) {
		const ddd = digits.slice(0, 2);
		const first = digits.slice(2, 7);
		const last = digits.slice(7, 11);
		return `+55 ${ddd} ${first}-${last}`;
	}

	// 10 dígitos = DDD + 8 dígitos (fixo, sem DDI)
	if (digits.length === 10) {
		const ddd = digits.slice(0, 2);
		const first = digits.slice(2, 6);
		const last = digits.slice(6, 10);
		return `+55 ${ddd} ${first}-${last}`;
	}

	// Internacional ou formato desconhecido — devolve com +
	return `+${digits}`;
}
