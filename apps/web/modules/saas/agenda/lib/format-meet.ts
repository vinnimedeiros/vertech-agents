import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export type FormatMeetClipboardInput = {
	title: string;
	startAt: Date;
	endAt: Date;
	meetLink: string;
	recipientName?: string | null;
	timeZone?: string;
};

/**
 * Formata bloco padrão estilo Google Calendar/Meet pra colar no WhatsApp.
 *
 * Saída exemplo:
 * ```
 * Para Cliente  |  Reunião de descoberta
 * Domingo, 26 de abril · 4:30 – 5:30pm
 * Fuso horário: America/Sao_Paulo
 * Como participar do Google Meet
 * Link da videochamada: https://meet.google.com/abc-defg-hij
 * ```
 *
 * Quando `recipientName` não vem, header fica só com o título.
 */
export function formatMeetClipboard({
	title,
	startAt,
	endAt,
	meetLink,
	recipientName,
	timeZone = DEFAULT_TIME_ZONE,
}: FormatMeetClipboardInput): string {
	const dayOfWeekRaw = format(startAt, "EEEE", { locale: ptBR });
	const dayOfWeek =
		dayOfWeekRaw.charAt(0).toUpperCase() + dayOfWeekRaw.slice(1);
	const dayMonth = format(startAt, "d 'de' MMMM", { locale: ptBR });
	const startTime = format(startAt, "h:mm");
	const endTime = format(endAt, "h:mmaaa");

	const header = recipientName
		? `Para ${recipientName}  |  ${title}`
		: title;

	return [
		header,
		`${dayOfWeek}, ${dayMonth} · ${startTime} – ${endTime}`,
		`Fuso horário: ${timeZone}`,
		"Como participar do Google Meet",
		`Link da videochamada: ${meetLink}`,
	].join("\n");
}

/**
 * Converte string de duração ("30 min", "1 hora", "1.5 horas", "Dia inteiro")
 * em minutos. Default 60min se formato desconhecido.
 */
export function parseDurationToMinutes(duration: string): number {
	const lower = duration.toLowerCase().trim();
	if (lower.includes("dia inteiro")) return 24 * 60;
	const minMatch = lower.match(/(\d+)\s*min/);
	if (minMatch) return Number.parseInt(minMatch[1], 10);
	const hourMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*hora/);
	if (hourMatch) {
		const hours = Number.parseFloat(hourMatch[1].replace(",", "."));
		return Math.round(hours * 60);
	}
	return 60;
}
