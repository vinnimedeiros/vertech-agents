"use server";

import { requireOrgAccess } from "@repo/auth";
import { calendar, calendarEvent, db, eq, sql } from "@repo/database";
import { logger } from "@repo/logs";
import { getSession } from "@saas/auth/lib/server";
import {
	deleteEventFromGoogle,
	pushEventToGoogle,
} from "@saas/integrations/google/lib/calendar-sync";
import { hasGoogleToken } from "@saas/integrations/google/lib/oauth-storage";
import { revalidatePath } from "next/cache";
import { findAvailableSlots } from "./availability";
import { listCalendarsForOrg } from "./server";

/**
 * Fire-and-forget: espelha mutação local no Google Calendar.
 * Erros logados mas não propagam — UX local não trava por falha remota.
 * Sync periódico (D.3 polling) corrige drift se push falhar.
 */
function mirrorToGoogle(
	op: "push" | "delete",
	organizationId: string,
	userId: string,
	payload: { eventId?: string; externalEventId?: string },
): void {
	void (async () => {
		try {
			const connected = await hasGoogleToken(organizationId, userId);
			if (!connected) return;
			if (op === "push" && payload.eventId) {
				const res = await pushEventToGoogle(
					organizationId,
					userId,
					payload.eventId,
				);
				if (!res.ok) {
					logger.warn(
						{ organizationId, userId, eventId: payload.eventId, error: res.error },
						"[agenda] Mirror push pro Google falhou",
					);
				}
			} else if (op === "delete" && payload.externalEventId) {
				const res = await deleteEventFromGoogle(
					organizationId,
					userId,
					payload.externalEventId,
				);
				if (!res.ok) {
					logger.warn(
						{
							organizationId,
							userId,
							externalEventId: payload.externalEventId,
							error: res.error,
						},
						"[agenda] Mirror delete no Google falhou",
					);
				}
			}
		} catch (err) {
			logger.error(
				{ err: err instanceof Error ? err.message : err, op },
				"[agenda] mirrorToGoogle exception",
			);
		}
	})();
}
import {
	addExternalAttendeeInputSchema,
	calendarIdSchema,
	createCalendarInputSchema,
	createEventInputSchema,
	eventIdSchema,
	findAvailableSlotsInputSchema,
	removeExternalAttendeeInputSchema,
	respondInviteInputSchema,
	updateCalendarInputSchema,
	updateEventInputSchema,
} from "./schemas";

async function requireAuthed() {
	const session = await getSession();
	if (!session?.user) throw new Error("UNAUTHENTICATED");
	return session.user;
}

function revalidateAgenda(slug: string) {
	revalidatePath(`/app/${slug}/crm/agenda`, "page");
}

/**
 * Server action wrapper de `listCalendarsForOrg` com guard de acesso.
 * Usado por componentes que abrem `EventForm` fora da página da agenda
 * (ex: botão "Reunião" no LeadModal).
 */
export async function getCalendarsForOrgAction(organizationId: string) {
	const user = await requireAuthed();
	await requireOrgAccess(user.id, organizationId);
	return listCalendarsForOrg(organizationId);
}

// =============================================
// Calendars
// =============================================

export async function createCalendarAction(input: unknown, slug: string) {
	const user = await requireAuthed();
	const data = createCalendarInputSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	const now = new Date();
	const [created] = await db
		.insert(calendar)
		.values({
			organizationId: data.organizationId,
			name: data.name,
			color: data.color,
			type: data.type,
			visible: true,
			isDefault: false,
			position: 0,
			createdBy: user.id,
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: calendar.id });

	revalidateAgenda(slug);
	return { calendarId: created.id };
}

export async function updateCalendarAction(input: unknown, slug: string) {
	const user = await requireAuthed();
	const data = updateCalendarInputSchema.parse(input);

	const row = await db.query.calendar.findFirst({
		where: eq(calendar.id, data.calendarId),
	});
	if (!row) throw new Error("CALENDAR_NOT_FOUND");
	await requireOrgAccess(user.id, row.organizationId);

	const patch: Partial<typeof calendar.$inferInsert> = {
		updatedAt: new Date(),
	};
	if (data.name !== undefined) patch.name = data.name;
	if (data.color !== undefined) patch.color = data.color;
	if (data.type !== undefined) patch.type = data.type;
	if (data.visible !== undefined) patch.visible = data.visible;

	await db.update(calendar).set(patch).where(eq(calendar.id, data.calendarId));

	revalidateAgenda(slug);
}

export async function deleteCalendarAction(input: unknown, slug: string) {
	const user = await requireAuthed();
	const data = calendarIdSchema.parse(input);

	const row = await db.query.calendar.findFirst({
		where: eq(calendar.id, data.calendarId),
	});
	if (!row) throw new Error("CALENDAR_NOT_FOUND");
	if (row.isDefault) throw new Error("CANNOT_DELETE_DEFAULT_CALENDAR");
	await requireOrgAccess(user.id, row.organizationId);

	await db.delete(calendar).where(eq(calendar.id, data.calendarId));
	revalidateAgenda(slug);
}

// =============================================
// Events
// =============================================

export async function createEventAction(input: unknown, slug: string) {
	const user = await requireAuthed();
	const data = createEventInputSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	const cal = await db.query.calendar.findFirst({
		where: eq(calendar.id, data.calendarId),
	});
	if (!cal || cal.organizationId !== data.organizationId) {
		throw new Error("INVALID_CALENDAR");
	}

	const now = new Date();
	const [created] = await db
		.insert(calendarEvent)
		.values({
			organizationId: data.organizationId,
			calendarId: data.calendarId,
			title: data.title,
			description: data.description ?? null,
			startAt: data.startAt,
			duration: data.duration,
			allDay: data.allDay,
			type: data.type,
			color: data.color ?? null,
			location: data.location ?? null,
			attendees: data.attendees,
			externalAttendees: data.externalAttendees,
			recurrenceRule: data.recurrenceRule ?? null,
			reminder: data.reminder,
			eventKind: data.eventKind,
			leadId: data.leadId ?? null,
			createdBy: user.id,
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: calendarEvent.id });

	revalidateAgenda(slug);

	// Modo Meet: precisa do link de volta — push SÍNCRONO (espera Google).
	// Sem token Google = sem como criar Meet → retorna erro user-friendly.
	if (data.eventKind === "meet") {
		const connected = await hasGoogleToken(data.organizationId, user.id);
		if (!connected) {
			return {
				eventId: created.id,
				eventKind: "meet" as const,
				meetLink: null,
				conferenceId: null,
				meetError: "GOOGLE_NOT_CONNECTED",
			};
		}
		const pushRes = await pushEventToGoogle(
			data.organizationId,
			user.id,
			created.id,
		);
		if (!pushRes.ok) {
			return {
				eventId: created.id,
				eventKind: "meet" as const,
				meetLink: null,
				conferenceId: null,
				meetError: pushRes.error ?? "PUSH_FAILED",
			};
		}
		// Re-read pra pegar meetLink/conferenceId atualizados pelo push
		const fresh = await db.query.calendarEvent.findFirst({
			where: eq(calendarEvent.id, created.id),
			columns: { meetLink: true, conferenceId: true },
		});
		return {
			eventId: created.id,
			eventKind: "meet" as const,
			meetLink: fresh?.meetLink ?? null,
			conferenceId: fresh?.conferenceId ?? null,
		};
	}

	// Modo evento: fire-and-forget (UX rápido, sync periódico corrige drift)
	mirrorToGoogle("push", data.organizationId, user.id, {
		eventId: created.id,
	});
	return {
		eventId: created.id,
		eventKind: "event" as const,
		meetLink: null,
		conferenceId: null,
	};
}

export async function updateEventAction(input: unknown, slug: string) {
	const user = await requireAuthed();
	const data = updateEventInputSchema.parse(input);

	const row = await db.query.calendarEvent.findFirst({
		where: eq(calendarEvent.id, data.eventId),
	});
	if (!row) throw new Error("EVENT_NOT_FOUND");
	await requireOrgAccess(user.id, row.organizationId);

	const patch: Partial<typeof calendarEvent.$inferInsert> = {
		updatedAt: new Date(),
	};
	if (data.title !== undefined) patch.title = data.title;
	if (data.description !== undefined) patch.description = data.description;
	if (data.startAt !== undefined) patch.startAt = data.startAt;
	if (data.duration !== undefined) patch.duration = data.duration;
	if (data.allDay !== undefined) patch.allDay = data.allDay;
	if (data.type !== undefined) patch.type = data.type;
	if (data.color !== undefined) patch.color = data.color;
	if (data.location !== undefined) patch.location = data.location;
	if (data.attendees !== undefined) patch.attendees = data.attendees;
	if (data.externalAttendees !== undefined) {
		patch.externalAttendees = data.externalAttendees;
	}
	if (data.recurrenceRule !== undefined) {
		patch.recurrenceRule = data.recurrenceRule ?? null;
	}
	if (data.reminder !== undefined) patch.reminder = data.reminder;
	if (data.calendarId !== undefined) patch.calendarId = data.calendarId;

	await db
		.update(calendarEvent)
		.set(patch)
		.where(eq(calendarEvent.id, data.eventId));

	revalidateAgenda(slug);
	mirrorToGoogle("push", row.organizationId, user.id, {
		eventId: data.eventId,
	});
}

export async function deleteEventAction(input: unknown, slug: string) {
	const user = await requireAuthed();
	const data = eventIdSchema.parse(input);

	const row = await db.query.calendarEvent.findFirst({
		where: eq(calendarEvent.id, data.eventId),
	});
	if (!row) throw new Error("EVENT_NOT_FOUND");
	await requireOrgAccess(user.id, row.organizationId);

	await db.delete(calendarEvent).where(eq(calendarEvent.id, data.eventId));
	revalidateAgenda(slug);

	// Delete remoto idempotente (404/410 tratados como sucesso)
	if (row.externalEventId) {
		mirrorToGoogle("delete", row.organizationId, user.id, {
			externalEventId: row.externalEventId,
		});
	}
}

// =============================================
// Availability — find free slots (D.1)
// =============================================

export async function findAvailableSlotsAction(input: unknown) {
	const user = await requireAuthed();
	const data = findAvailableSlotsInputSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	if (data.from >= data.to) {
		throw new Error("INVALID_RANGE");
	}

	return findAvailableSlots(data);
}

// =============================================
// External attendees (D.5 — convidados externos via email)
// =============================================

export async function addExternalAttendeeAction(input: unknown, slug: string) {
	const user = await requireAuthed();
	const data = addExternalAttendeeInputSchema.parse(input);

	const row = await db.query.calendarEvent.findFirst({
		where: eq(calendarEvent.id, data.eventId),
	});
	if (!row) throw new Error("EVENT_NOT_FOUND");
	await requireOrgAccess(user.id, row.organizationId);

	const list = (row.externalAttendees ?? []).slice();
	if (list.find((a) => a.email.toLowerCase() === data.email.toLowerCase())) {
		throw new Error("ATTENDEE_ALREADY_EXISTS");
	}
	list.push({ email: data.email, name: data.name, status: "pending" });

	await db
		.update(calendarEvent)
		.set({ externalAttendees: list, updatedAt: new Date() })
		.where(eq(calendarEvent.id, data.eventId));

	revalidateAgenda(slug);
	return { count: list.length };
}

export async function removeExternalAttendeeAction(
	input: unknown,
	slug: string,
) {
	const user = await requireAuthed();
	const data = removeExternalAttendeeInputSchema.parse(input);

	const row = await db.query.calendarEvent.findFirst({
		where: eq(calendarEvent.id, data.eventId),
	});
	if (!row) throw new Error("EVENT_NOT_FOUND");
	await requireOrgAccess(user.id, row.organizationId);

	const list = (row.externalAttendees ?? []).filter(
		(a) => a.email.toLowerCase() !== data.email.toLowerCase(),
	);

	await db
		.update(calendarEvent)
		.set({ externalAttendees: list, updatedAt: new Date() })
		.where(eq(calendarEvent.id, data.eventId));

	revalidateAgenda(slug);
	return { count: list.length };
}

/**
 * Endpoint público (chamado pelo link no email do convite). Token signed
 * valida que o convidado é dono daquele email pra aquele evento.
 *
 * Token format: `eventId.email.hmac(secret)` — implementado em D.5 quando
 * email worker for ligado.
 */
export async function respondInviteAction(input: unknown) {
	const data = respondInviteInputSchema.parse(input);

	// TODO D.5: validar HMAC do token contra OAUTH_ENCRYPTION_KEY ou secret separado
	// const expected = signInviteToken(data.eventId, data.email);
	// if (!constantTimeEqual(data.token, expected)) throw new Error("INVALID_TOKEN");

	const row = await db.query.calendarEvent.findFirst({
		where: eq(calendarEvent.id, data.eventId),
	});
	if (!row) throw new Error("EVENT_NOT_FOUND");

	const list = (row.externalAttendees ?? []).map((a) =>
		a.email.toLowerCase() === data.email.toLowerCase()
			? { ...a, status: data.response }
			: a,
	);

	await db
		.update(calendarEvent)
		.set({ externalAttendees: list, updatedAt: new Date() })
		.where(eq(calendarEvent.id, data.eventId));

	return { ok: true };
}
