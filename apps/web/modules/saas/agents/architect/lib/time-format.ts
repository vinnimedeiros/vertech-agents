/**
 * Helper de tempo relativo em pt-BR — "há 5 minutos", "há 3 horas", "há 2 dias".
 *
 * Usado na tela de boas-vindas do Arquiteto (story 09.1) pra mostrar quando
 * cada rascunho foi tocado pela ultima vez.
 *
 * Evita dep externa (date-fns ja esta no projeto mas pra manter DraftCard
 * standalone-friendly mantemos calculo inline aqui).
 */

type DateInput = Date | string | number;

export function formatRelativeTime(input: DateInput): string {
	const target = input instanceof Date ? input : new Date(input);
	const diffMs = Date.now() - target.getTime();

	if (Number.isNaN(diffMs)) return "em algum momento";
	if (diffMs < 0) return "agora mesmo";

	const seconds = Math.floor(diffMs / 1000);
	if (seconds < 60) return "agora mesmo";

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `há ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;
	}

	const days = Math.floor(hours / 24);
	if (days < 7) {
		return `há ${days} ${days === 1 ? "dia" : "dias"}`;
	}

	const weeks = Math.floor(days / 7);
	if (weeks < 4) {
		return `há ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
	}

	const months = Math.floor(days / 30);
	if (months < 12) {
		return `há ${months} ${months === 1 ? "mês" : "meses"}`;
	}

	const years = Math.floor(days / 365);
	return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}
