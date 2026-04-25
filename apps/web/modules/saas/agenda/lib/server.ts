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
 * Futuro: filtrar por calendar.visible.
 */
export async function listEventsInRange(
	organizationId: string,
	from: Date,
	to: Date,
) {
	return db
		.select()
		.from(calendarEvent)
		.where(
			and(
				eq(calendarEvent.organizationId, organizationId),
				gte(calendarEvent.startAt, from),
				lte(calendarEvent.startAt, to),
			),
		)
		.orderBy(asc(calendarEvent.startAt));
}
