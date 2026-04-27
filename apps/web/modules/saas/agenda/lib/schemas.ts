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

export const externalAttendeeSchema = z.object({
	email: z.string().email(),
	name: z.string().max(80).optional(),
	status: z.enum(["pending", "accepted", "declined"]).optional(),
});

// RRULE iCal (RFC 5545). Validado por sintaxe básica; rrule lib faz parse robusto.
// Ex: "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231T235959Z"
export const recurrenceRuleSchema = z
	.string()
	.max(500)
	.regex(/^FREQ=(SECONDLY|MINUTELY|HOURLY|DAILY|WEEKLY|MONTHLY|YEARLY)/, {
		message: "RRULE deve começar com FREQ=...",
	})
	.optional()
	.nullable();

export const eventKindSchema = z.enum(["event", "meet"]);

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
	externalAttendees: z.array(externalAttendeeSchema).default([]),
	reminder: z.boolean().default(true),
	recurrenceRule: recurrenceRuleSchema,
	/** `meet` cria videochamada Google Meet via conferenceData.createRequest no push */
	eventKind: eventKindSchema.default("event"),
	/** Vincula evento a lead do CRM (LeadModal shortcut). NULL em agenda standalone. */
	leadId: z.string().nullable().optional(),
});

export const updateEventInputSchema = createEventInputSchema
	.partial()
	.extend({ eventId: z.string() });

export const eventIdSchema = z.object({
	eventId: z.string(),
});

// =============================================
// Availability schemas (D.1 free-slot finder)
// =============================================

export const findAvailableSlotsInputSchema = z.object({
	organizationId: z.string(),
	from: z.coerce.date(),
	to: z.coerce.date(),
	durationMinutes: z.number().int().min(5).max(1440).default(30),
	calendarIds: z.array(z.string()).optional(), // se omitido, considera todos da org
	workingHoursStart: z.number().int().min(0).max(23).default(9),
	workingHoursEnd: z.number().int().min(0).max(23).default(18),
	excludeWeekends: z.boolean().default(true),
});

// =============================================
// External attendee actions (D.5)
// =============================================

export const addExternalAttendeeInputSchema = z.object({
	eventId: z.string(),
	email: z.string().email(),
	name: z.string().max(80).optional(),
});

export const removeExternalAttendeeInputSchema = z.object({
	eventId: z.string(),
	email: z.string().email(),
});

export const respondInviteInputSchema = z.object({
	eventId: z.string(),
	email: z.string().email(),
	response: z.enum(["accepted", "declined"]),
	token: z.string().min(20), // signed token enviado no email
});

export type CalendarType = z.infer<typeof calendarTypeSchema>;
export type EventType = z.infer<typeof eventTypeSchema>;
export type EventKind = z.infer<typeof eventKindSchema>;
export type Attendee = z.infer<typeof attendeeSchema>;
export type ExternalAttendee = z.infer<typeof externalAttendeeSchema>;
