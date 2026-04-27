import { and, asc, calendar, calendarEvent, db, eq, gte, lte } from "@repo/database";

/**
 * Lista calendars de uma org ordenados por isDefault DESC + position ASC.
 */
export async function listCalendarsForOrg(organizationId: string) {
	return db
		.select()
		.from(calendar)
		.where(eq(calendar.organizationId, organizationId))
		.orderBy(asc(calendar.position), asc(calendar.createdAt));
}

/**
 * Lista events de uma org num range [from, to]. Inclui endpoints.
 * Filtra `isSandbox=false` por default (Wave 1 G.P0.1) — sandbox
 * playground deve passar `includeSandbox: true` quando exibir eventos
 * de teste. Futuro: filtrar por calendar.visible.
 */
export async function listEventsInRange(
	organizationId: string,
	from: Date,
	to: Date,
	options?: { includeSandbox?: boolean },
) {
	const conditions = [
		eq(calendarEvent.organizationId, organizationId),
		gte(calendarEvent.startAt, from),
		lte(calendarEvent.startAt, to),
	];
	if (!options?.includeSandbox) {
		conditions.push(eq(calendarEvent.isSandbox, false));
	}

	return db
		.select()
		.from(calendarEvent)
		.where(and(...conditions))
		.orderBy(asc(calendarEvent.startAt));
}
