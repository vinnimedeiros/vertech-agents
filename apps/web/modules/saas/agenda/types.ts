import type { calendar, calendarEvent } from "@repo/database";

export type CalendarRow = typeof calendar.$inferSelect;
export type CalendarEventRow = typeof calendarEvent.$inferSelect;

export type EventTypeKey =
	| "meeting"
	| "event"
	| "personal"
	| "task"
	| "reminder";

export type CalendarTypeKey = "personal" | "work" | "shared";

// Metadata visual dos tipos de evento (labels + cores default)
export const EVENT_TYPE_META: Record<
	EventTypeKey,
	{ label: string; color: string }
> = {
	meeting: { label: "Reunião", color: "bg-blue-500" },
	event: { label: "Evento", color: "bg-green-500" },
	personal: { label: "Pessoal", color: "bg-pink-500" },
	task: { label: "Tarefa", color: "bg-orange-500" },
	reminder: { label: "Lembrete", color: "bg-purple-500" },
};

export const CALENDAR_COLOR_OPTIONS = [
	"bg-blue-500",
	"bg-green-500",
	"bg-pink-500",
	"bg-orange-500",
	"bg-purple-500",
	"bg-red-500",
	"bg-yellow-500",
	"bg-teal-500",
] as const;

export const DURATION_OPTIONS = [
	"15 min",
	"30 min",
	"45 min",
	"1 hora",
	"1,5 horas",
	"2 horas",
	"3 horas",
	"Dia inteiro",
] as const;

// Slots de horário em 24h PT-BR (07:00 às 22:30, step 30min)
export const TIME_SLOTS: string[] = Array.from({ length: 32 }, (_, i) => {
	const totalMinutes = 7 * 60 + i * 30;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});
