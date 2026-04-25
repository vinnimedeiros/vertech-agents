"use server";

import { requireOrgAccess } from "@repo/auth";
import { calendar, calendarEvent, db, eq } from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { revalidatePath } from "next/cache";
import {
	calendarIdSchema,
	createCalendarInputSchema,
	createEventInputSchema,
	eventIdSchema,
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

	// Valida que calendarId pertence a essa org
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
			reminder: data.reminder,
			createdBy: user.id,
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: calendarEvent.id });

	revalidateAgenda(slug);
	return { eventId: created.id };
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
	if (data.reminder !== undefined) patch.reminder = data.reminder;
	if (data.calendarId !== undefined) patch.calendarId = data.calendarId;

	await db
		.update(calendarEvent)
		.set(patch)
		.where(eq(calendarEvent.id, data.eventId));

	revalidateAgenda(slug);
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
}
