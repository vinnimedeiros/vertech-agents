import {
	and,
	asc,
	calendar,
	calendarEvent,
	db,
	eq,
	gte,
	inArray,
	lte,
} from "@repo/database";
import { expandRecurrence, parseDurationToMinutes } from "./recurrence";

export type FreeSlot = {
	startAt: Date;
	endAt: Date;
	durationMinutes: number;
};

export type FindSlotsParams = {
	organizationId: string;
	from: Date;
	to: Date;
	durationMinutes: number;
	calendarIds?: string[];
	workingHoursStart: number;
	workingHoursEnd: number;
	excludeWeekends: boolean;
};

/**
 * Encontra slots livres na agenda da org dentro do range, considerando
 * working hours, fins de semana, e expandindo eventos recorrentes.
 *
 * Algoritmo:
 * 1. Lista todos eventos no range (incluindo expansão de RRULE)
 * 2. Cria janelas working hours por dia
 * 3. Subtrai eventos das janelas → slots livres
 * 4. Filtra slots >= durationMinutes
 *
 * NÃO considera disponibilidade de attendees externos (Google Calendar
 * sync trará isso em D.3).
 */
export async function findAvailableSlots(
	params: FindSlotsParams,
): Promise<FreeSlot[]> {
	const conditions = [
		eq(calendarEvent.organizationId, params.organizationId),
		gte(calendarEvent.startAt, params.from),
		lte(calendarEvent.startAt, params.to),
		eq(calendarEvent.isSandbox, false),
	];
	if (params.calendarIds?.length) {
		conditions.push(inArray(calendarEvent.calendarId, params.calendarIds));
	}

	const events = await db
		.select()
		.from(calendarEvent)
		.where(and(...conditions))
		.orderBy(asc(calendarEvent.startAt));

	const occurrences = events.flatMap((e) =>
		expandRecurrence(e, params.from, params.to),
	);

	const busy = occurrences
		.map((o) => {
			const start = o.occurrenceStartAt;
			const durMin = parseDurationToMinutes(o.duration);
			const end = new Date(start.getTime() + durMin * 60_000);
			return { start, end };
		})
		.sort((a, b) => a.start.getTime() - b.start.getTime());

	const merged: { start: Date; end: Date }[] = [];
	for (const b of busy) {
		const last = merged[merged.length - 1];
		if (last && b.start <= last.end) {
			last.end = new Date(Math.max(last.end.getTime(), b.end.getTime()));
		} else {
			merged.push({ ...b });
		}
	}

	const slots: FreeSlot[] = [];
	const cursor = new Date(params.from);
	while (cursor < params.to) {
		const dow = cursor.getDay();
		if (params.excludeWeekends && (dow === 0 || dow === 6)) {
			cursor.setDate(cursor.getDate() + 1);
			cursor.setHours(0, 0, 0, 0);
			continue;
		}

		const dayStart = new Date(cursor);
		dayStart.setHours(params.workingHoursStart, 0, 0, 0);
		const dayEnd = new Date(cursor);
		dayEnd.setHours(params.workingHoursEnd, 0, 0, 0);

		if (dayStart < params.from) dayStart.setTime(params.from.getTime());
		if (dayEnd > params.to) dayEnd.setTime(params.to.getTime());

		const dayBusy = merged.filter(
			(b) => b.end > dayStart && b.start < dayEnd,
		);

		let slotStart = dayStart;
		for (const b of dayBusy) {
			if (b.start > slotStart) {
				const free = (b.start.getTime() - slotStart.getTime()) / 60_000;
				if (free >= params.durationMinutes) {
					slots.push({
						startAt: new Date(slotStart),
						endAt: new Date(b.start),
						durationMinutes: Math.floor(free),
					});
				}
			}
			if (b.end > slotStart) slotStart = new Date(b.end);
		}
		if (slotStart < dayEnd) {
			const free = (dayEnd.getTime() - slotStart.getTime()) / 60_000;
			if (free >= params.durationMinutes) {
				slots.push({
					startAt: new Date(slotStart),
					endAt: new Date(dayEnd),
					durationMinutes: Math.floor(free),
				});
			}
		}

		cursor.setDate(cursor.getDate() + 1);
		cursor.setHours(0, 0, 0, 0);
	}

	return slots;
}
