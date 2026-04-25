import { z } from "zod";

export const calendarTypeSchema = z.enum(["personal", "work", "shared"]);
export const eventTypeSchema = z.enum([
	"meeting",
	"event",
	"personal",
	"task",
	"reminder",
]);

// Tailwind colors aceitos pra calendar/event (shadcn palette). Mantido permissivo.
export const colorSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^bg-[a-z]+-\d{3}$/, "Cor deve ser tailwind class bg-xxx-###");

// =============================================
// Calendar schemas
// =============================================

export const createCalendarInputSchema = z.object({
	organizationId: z.string(),
	name: z.string().min(1).max(80),
	color: colorSchema.default("bg-blue-500"),
	type: calendarTypeSchema.default("personal"),
});

export const updateCalendarInputSchema = z.object({
	calendarId: z.string(),
	name: z.string().min(1).max(80).optional(),
	color: colorSchema.optional(),
	type: calendarTypeSchema.optional(),
	visible: z.boolean().optional(),
});

export const calendarIdSchema = z.object({
	calendarId: z.string(),
});

// =============================================
// Event schemas
// =============================================

export const attendeeSchema = z.object({
	name: z.string().min(1).max(80),
	initials: z.string().max(4).optional(),
	userId: z.string().nullable().optional(),
});

export const createEventInputSchema = z.object({
	organizationId: z.string(),
	calendarId: z.string(),
	title: z.string().min(1).max(200),
	description: z.string().max(5000).optional().nullable(),
	startAt: z.coerce.date(),
	duration: z.string().max(64).default("1 hora"),
	allDay: z.boolean().default(false),
	type: eventTypeSchema.default("meeting"),
	color: colorSchema.optional().nullable(),
	location: z.string().max(200).optional().nullable(),
	attendees: z.array(attendeeSchema).default([]),
	reminder: z.boolean().default(true),
});

export const updateEventInputSchema = createEventInputSchema
	.partial()
	.extend({ eventId: z.string() });

export const eventIdSchema = z.object({
	eventId: z.string(),
});

export type CalendarType = z.infer<typeof calendarTypeSchema>;
export type EventType = z.infer<typeof eventTypeSchema>;
export type Attendee = z.infer<typeof attendeeSchema>;
