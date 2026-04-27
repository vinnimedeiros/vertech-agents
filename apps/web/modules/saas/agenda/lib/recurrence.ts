import { RRule } from "rrule";

export type ExpandedEvent<T> = T & {
	occurrenceStartAt: Date;
	occurrenceId: string; // `${eventId}:${ISO start}`
	isRecurringInstance: boolean;
};

/**
 * Expande um evento com RRULE em instâncias virtuais dentro do range.
 * Não persiste — gera ocorrências on-the-fly pra exibir na UI.
 *
 * Eventos sem `recurrenceRule` retornam 1 ocorrência (a própria).
 *
 * @param event Evento base (precisa ter `id`, `startAt`, `recurrenceRule`)
 * @param from Início da janela
 * @param to Fim da janela
 * @returns Lista de ocorrências dentro da janela
 */
export function expandRecurrence<
	T extends {
		id: string;
		startAt: Date;
		recurrenceRule?: string | null;
	},
>(event: T, from: Date, to: Date): ExpandedEvent<T>[] {
	if (!event.recurrenceRule) {
		const start = new Date(event.startAt);
		if (start < from || start > to) return [];
		return [
			{
				...event,
				occurrenceStartAt: start,
				occurrenceId: `${event.id}:${start.toISOString()}`,
				isRecurringInstance: false,
			},
		];
	}

	let rule: RRule;
	try {
		rule = RRule.fromString(
			`DTSTART:${formatICalDate(event.startAt)}\nRRULE:${event.recurrenceRule}`,
		);
	} catch (err) {
		console.warn(
			"[expandRecurrence] RRULE inválido, retornando ocorrência única:",
			event.id,
			err instanceof Error ? err.message : err,
		);
		return [
			{
				...event,
				occurrenceStartAt: new Date(event.startAt),
				occurrenceId: `${event.id}:${event.startAt.toISOString()}`,
				isRecurringInstance: false,
			},
		];
	}

	const occurrences = rule.between(from, to, true);
	return occurrences.map((startAt) => ({
		...event,
		occurrenceStartAt: startAt,
		occurrenceId: `${event.id}:${startAt.toISOString()}`,
		isRecurringInstance: true,
	}));
}

/**
 * iCal date format: YYYYMMDDTHHMMSSZ (UTC).
 */
function formatICalDate(date: Date): string {
	const d = date instanceof Date ? date : new Date(date);
	const pad = (n: number) => String(n).padStart(2, "0");
	const yyyy = d.getUTCFullYear();
	const mm = pad(d.getUTCMonth() + 1);
	const dd = pad(d.getUTCDate());
	const hh = pad(d.getUTCHours());
	const min = pad(d.getUTCMinutes());
	const ss = pad(d.getUTCSeconds());
	return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

/**
 * Parse duração string-livre (ex: "30 min", "1 hora", "2h", "1.5 horas")
 * pra minutos. Default 60 se não conseguir parsear.
 */
export function parseDurationToMinutes(duration: string): number {
	if (!duration) return 60;
	const lower = duration.toLowerCase().trim();
	if (lower === "dia inteiro" || lower === "all day") return 60 * 24;

	const numMatch = lower.match(/([\d.,]+)/);
	if (!numMatch) return 60;
	const num = Number.parseFloat(numMatch[1].replace(",", "."));
	if (Number.isNaN(num)) return 60;

	if (lower.includes("hora") || lower.endsWith("h")) return Math.round(num * 60);
	if (lower.includes("min") || lower.endsWith("m")) return Math.round(num);
	return 60;
}
