import { createId as cuid } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { lead } from "./crm";
import { organization, user } from "./postgres";

// =============================================
// Enums
// =============================================

export const calendarTypeEnum = pgEnum("CalendarType", [
	"personal",
	"work",
	"shared",
]);

export const calendarEventTypeEnum = pgEnum("CalendarEventType", [
	"meeting",
	"event",
	"personal",
	"task",
	"reminder",
]);

/**
 * Distingue evento simples (só agenda) de reunião com videochamada (Meet).
 * - `event`: evento normal sem link de vídeo
 * - `meet`: evento com Google Meet — `meetLink` e `conferenceId` populados
 *   após push pro Google Calendar com `conferenceData.createRequest`
 *
 * Extensão futura: `zoom`, `teams` etc.
 */
export const calendarEventKindEnum = pgEnum("CalendarEventKind", [
	"event",
	"meet",
]);

// =============================================
// JSONB types
// =============================================

export type CalendarEventAttendee = {
	name: string;
	initials?: string;
	userId?: string | null;
};

// =============================================
// Calendar
// =============================================

/**
 * Calendários de uma organização. Cada org pode ter múltiplos calendários
 * (Pessoal, Trabalho, Equipe, etc). Eventos pertencem a um calendário.
 *
 * Regra MUST `feedback_multi_layer_features.md`: toda org (S/M/A/C) recebe
 * pelo menos 1 calendar "Pessoal" default via ensureDefaultOperationalKit.
 */
export const calendar = pgTable(
	"calendar",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),

		name: text("name").notNull(),
		// Tailwind color class (ex: "bg-blue-500")
		color: varchar("color", { length: 64 }).notNull().default("bg-blue-500"),
		type: calendarTypeEnum("type").notNull().default("personal"),
		visible: boolean("visible").notNull().default(true),
		isDefault: boolean("isDefault").notNull().default(false),

		position: integer("position").notNull().default(0),

		createdBy: text("createdBy").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("calendar_organization_idx").on(table.organizationId),
		index("calendar_org_default_idx").on(
			table.organizationId,
			table.isDefault,
		),
	],
);

// =============================================
// Calendar Event
// =============================================

/**
 * Evento do calendário. Tem data+hora, duração, tipo, local, attendees.
 * Um evento pertence a 1 calendário. Deletar calendário cascade apaga eventos.
 */
export const calendarEvent = pgTable(
	"calendar_event",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		calendarId: text("calendarId")
			.notNull()
			.references(() => calendar.id, { onDelete: "cascade" }),

		title: text("title").notNull(),
		description: text("description"),

		// startAt ancora data+hora de início. duration é formato livre ("1 hora", "30 min", "Dia inteiro")
		startAt: timestamp("startAt").notNull(),
		duration: varchar("duration", { length: 64 }).notNull().default("1 hora"),
		allDay: boolean("allDay").notNull().default(false),

		type: calendarEventTypeEnum("type").notNull().default("meeting"),
		// Tailwind color class override (vem do type default se null)
		color: varchar("color", { length: 64 }),

		location: text("location"),

		// Lista de attendees (nomes + iniciais + userId opcional)
		attendees: jsonb("attendees")
			.$type<CalendarEventAttendee[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),

		// Convidados externos por email (D.5). Cada item: {email, name?, status: pending|accepted|declined}
		externalAttendees: jsonb("externalAttendees")
			.$type<{
				email: string;
				name?: string;
				status?: "pending" | "accepted" | "declined";
			}[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),

		reminder: boolean("reminder").notNull().default(true),

		// Recorrência iCal RRULE (D.1). Null = evento único.
		// Ex: "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231T235959Z"
		recurrenceRule: text("recurrenceRule"),
		// ID do evento "pai" quando esta linha é uma exceção/instância modificada
		// de uma série recorrente
		recurrenceParentId: text("recurrenceParentId"),

		// Sync externo (D.3 Google Calendar)
		externalProvider: varchar("externalProvider", { length: 32 }), // "google" | null
		externalEventId: text("externalEventId"), // ID do evento no provider
		externalEtag: text("externalEtag"), // ETag pra detectar mudança remota
		externalSyncedAt: timestamp("externalSyncedAt"),

		// Google Meet — populado após push com conferenceData.createRequest (D.3 Meet)
		eventKind: calendarEventKindEnum("eventKind").notNull().default("event"),
		meetLink: text("meetLink"), // URL pública da videochamada (ex: https://meet.google.com/abc-defg-hij)
		conferenceId: text("conferenceId"), // ID interno da conferência no Google (pra updates idempotentes)

		// Vincula evento a lead do CRM (LeadModal shortcut). NULL em agenda standalone / pull Google.
		leadId: varchar("leadId", { length: 255 }).references(() => lead.id, {
			onDelete: "set null",
		}),

		// M2-02 Sandbox flag
		isSandbox: boolean("isSandbox").notNull().default(false),

		createdBy: text("createdBy").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("calendar_event_org_start_idx").on(
			table.organizationId,
			table.startAt,
		),
		index("calendar_event_calendar_idx").on(table.calendarId),
		index("calendar_event_external_idx").on(
			table.externalProvider,
			table.externalEventId,
		),
		index("calendar_event_recurrence_parent_idx").on(table.recurrenceParentId),
		index("calendar_event_lead_idx").on(table.leadId),
	],
);

// =============================================
// Relations
// =============================================

export const calendarRelations = relations(calendar, ({ one, many }) => ({
	organization: one(organization, {
		fields: [calendar.organizationId],
		references: [organization.id],
	}),
	creator: one(user, {
		fields: [calendar.createdBy],
		references: [user.id],
	}),
	events: many(calendarEvent),
}));

export const calendarEventRelations = relations(calendarEvent, ({ one }) => ({
	organization: one(organization, {
		fields: [calendarEvent.organizationId],
		references: [organization.id],
	}),
	calendar: one(calendar, {
		fields: [calendarEvent.calendarId],
		references: [calendar.id],
	}),
	creator: one(user, {
		fields: [calendarEvent.createdBy],
		references: [user.id],
	}),
	lead: one(lead, {
		fields: [calendarEvent.leadId],
		references: [lead.id],
	}),
}));
