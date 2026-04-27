import "server-only";

import { calendar_v3 } from "@googleapis/calendar";
import {
	and,
	calendar as calendarTable,
	calendarEvent,
	db,
	eq,
	type OAuthTokenMetadata,
} from "@repo/database";
import { logger } from "@repo/logs";
import { getGoogleCalendarClient } from "./calendar-client";
import {
	getGoogleTokenRecord,
	saveGoogleToken,
} from "./oauth-storage";

const PRIMARY_CALENDAR = "primary";
const PULL_PAST_DAYS = 7;
const PULL_FUTURE_DAYS = 90;

export type SyncResult = {
	ok: boolean;
	pulled: number;
	pushed: number;
	deleted: number;
	error?: string;
	mode: "delta" | "full";
};

// ----------------------------------------------------------------------------
// Pull: Google → Vertech
// ----------------------------------------------------------------------------

/**
 * Sincroniza eventos do Google Calendar (primary) → calendar local da org.
 * Modo delta: usa `syncToken` salvo na metadata (pull incremental).
 * Modo full: primeira execução ou após erro de sync token (410 Gone).
 *
 * Mapeia por (organizationId, externalProvider="google", externalEventId).
 * Eventos cancelados no Google (`status=cancelled`) deletam local match.
 */
export async function syncCalendarPull(
	organizationId: string,
	userId: string,
	options: { force?: boolean } = {},
): Promise<SyncResult> {
	let pulled = 0;
	let deleted = 0;
	const record = await getGoogleTokenRecord(organizationId, userId);
	if (!record) {
		return {
			ok: false,
			pulled,
			pushed: 0,
			deleted,
			error: "NOT_CONNECTED",
			mode: "full",
		};
	}

	const localCalendar = await resolveLocalCalendarForGoogle(
		organizationId,
		record.metadata,
	);
	if (!localCalendar) {
		return {
			ok: false,
			pulled,
			pushed: 0,
			deleted,
			error: "NO_LOCAL_CALENDAR",
			mode: "full",
		};
	}

	const client = await getGoogleCalendarClient(organizationId, userId);
	const initialSyncToken = options.force
		? undefined
		: (record.metadata.googleCalendarSyncToken ?? undefined);

	const useDelta = !!initialSyncToken;
	let mode: SyncResult["mode"] = useDelta ? "delta" : "full";

	let pageToken: string | undefined;
	let syncToken: string | undefined = initialSyncToken;
	let nextSyncToken: string | undefined;

	const baseParams: calendar_v3.Params$Resource$Events$List = {
		calendarId: PRIMARY_CALENDAR,
		singleEvents: true,
		showDeleted: true,
		maxResults: 250,
	};

	if (!useDelta) {
		const now = Date.now();
		baseParams.timeMin = new Date(
			now - PULL_PAST_DAYS * 24 * 60 * 60 * 1000,
		).toISOString();
		baseParams.timeMax = new Date(
			now + PULL_FUTURE_DAYS * 24 * 60 * 60 * 1000,
		).toISOString();
		baseParams.orderBy = "startTime";
	}

	let pages = 0;
	const MAX_PAGES = 20; // hard stop pra evitar loop infinito em datasets enormes
	try {
		do {
			pages += 1;
			const params: calendar_v3.Params$Resource$Events$List = {
				...baseParams,
				...(syncToken && !pageToken ? { syncToken } : {}),
				...(pageToken ? { pageToken } : {}),
			};
			type EventsListData = calendar_v3.Schema$Events;
			let res: { data: EventsListData };
			try {
				res = await client.events.list(params);
			} catch (err) {
				// 410 Gone = syncToken expirou. Cair pra full sync.
				const status = (err as { code?: number; status?: number }).code ??
					(err as { code?: number; status?: number }).status;
				if (status === 410 && useDelta) {
					logger.info(
						{ organizationId, userId },
						"[google-calendar] syncToken expirou, full re-sync",
					);
					return await syncCalendarPull(organizationId, userId, {
						force: true,
					});
				}
				throw err;
			}

			const items = res.data.items ?? [];
			for (const item of items) {
				const result = await applyGoogleEventToLocal(
					organizationId,
					localCalendar.id,
					item,
				);
				if (result === "upserted") pulled += 1;
				else if (result === "deleted") deleted += 1;
			}

			pageToken = res.data.nextPageToken ?? undefined;
			if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;
			if (pageToken && pages >= MAX_PAGES) {
				logger.warn(
					{ organizationId, userId, pages },
					"[google-calendar] MAX_PAGES atingido, encerrando pull antes de drain",
				);
				break;
			}
		} while (pageToken);

		// Persiste novo syncToken pra próximo delta. Se nextSyncToken não veio
		// (parada antecipada), preserva o anterior.
		if (nextSyncToken) {
			const updated: OAuthTokenMetadata = {
				...record.metadata,
				googleCalendarSyncToken: nextSyncToken,
				lastSyncAt: new Date().toISOString(),
			};
			await saveGoogleToken({
				organizationId: record.organizationId,
				userId: record.userId,
				providerAccountId: record.providerAccountId,
				scope: record.scope,
				accessToken: record.accessToken,
				refreshToken: record.refreshToken,
				expiresAt: record.expiresAt,
				metadata: updated,
			});
		} else if (!useDelta) {
			// Full sync sem nextSyncToken (raro) — só atualiza lastSyncAt
			const updated: OAuthTokenMetadata = {
				...record.metadata,
				lastSyncAt: new Date().toISOString(),
			};
			await saveGoogleToken({
				organizationId: record.organizationId,
				userId: record.userId,
				providerAccountId: record.providerAccountId,
				scope: record.scope,
				accessToken: record.accessToken,
				refreshToken: record.refreshToken,
				expiresAt: record.expiresAt,
				metadata: updated,
			});
		}

		return { ok: true, pulled, pushed: 0, deleted, mode };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.error(
			{ err: message, organizationId, userId },
			"[google-calendar] Pull falhou",
		);
		return {
			ok: false,
			pulled,
			pushed: 0,
			deleted,
			error: message,
			mode,
		};
	}
}

async function resolveLocalCalendarForGoogle(
	organizationId: string,
	metadata: OAuthTokenMetadata,
): Promise<{ id: string } | null> {
	const mappedId = metadata.googleCalendarMappedCalendarId as
		| string
		| undefined;
	if (mappedId) {
		const found = await db.query.calendar.findFirst({
			where: and(
				eq(calendarTable.id, mappedId),
				eq(calendarTable.organizationId, organizationId),
			),
			columns: { id: true },
		});
		if (found) return found;
	}
	const fallback = await db.query.calendar.findFirst({
		where: and(
			eq(calendarTable.organizationId, organizationId),
			eq(calendarTable.isDefault, true),
		),
		columns: { id: true },
	});
	if (fallback) return fallback;
	const any = await db.query.calendar.findFirst({
		where: eq(calendarTable.organizationId, organizationId),
		columns: { id: true },
	});
	return any ?? null;
}

async function applyGoogleEventToLocal(
	organizationId: string,
	localCalendarId: string,
	g: calendar_v3.Schema$Event,
): Promise<"upserted" | "deleted" | "skipped"> {
	const externalEventId = g.id;
	if (!externalEventId) return "skipped";

	const existing = await db.query.calendarEvent.findFirst({
		where: and(
			eq(calendarEvent.organizationId, organizationId),
			eq(calendarEvent.externalProvider, "google"),
			eq(calendarEvent.externalEventId, externalEventId),
		),
	});

	if (g.status === "cancelled") {
		if (existing) {
			await db
				.delete(calendarEvent)
				.where(eq(calendarEvent.id, existing.id));
			return "deleted";
		}
		return "skipped";
	}

	const startISO = g.start?.dateTime ?? g.start?.date;
	if (!startISO) return "skipped";
	const startAt = new Date(startISO);
	const allDay = !g.start?.dateTime && !!g.start?.date;
	const duration = computeDurationLabel(g.start, g.end, allDay);
	const meet = extractMeetInfo(g);

	const patch: Partial<typeof calendarEvent.$inferInsert> = {
		title: g.summary ?? "(sem título)",
		description: g.description ?? null,
		startAt,
		duration,
		allDay,
		location: g.location ?? null,
		externalProvider: "google",
		externalEventId,
		externalEtag: g.etag ?? null,
		externalSyncedAt: new Date(),
		updatedAt: new Date(),
		...(meet
			? {
					meetLink: meet.meetLink,
					conferenceId: meet.conferenceId,
					eventKind: "meet" as const,
				}
			: {}),
	};

	if (existing) {
		await db
			.update(calendarEvent)
			.set(patch)
			.where(eq(calendarEvent.id, existing.id));
	} else {
		await db.insert(calendarEvent).values({
			organizationId,
			calendarId: localCalendarId,
			title: patch.title!,
			description: patch.description ?? null,
			startAt: patch.startAt!,
			duration: patch.duration!,
			allDay: patch.allDay!,
			type: "event",
			location: patch.location ?? null,
			attendees: [],
			externalAttendees: [],
			recurrenceRule: g.recurrence?.[0] ?? null,
			reminder: true,
			externalProvider: "google",
			externalEventId,
			externalEtag: g.etag ?? null,
			externalSyncedAt: new Date(),
			eventKind: meet ? "meet" : "event",
			meetLink: meet?.meetLink ?? null,
			conferenceId: meet?.conferenceId ?? null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	return "upserted";
}

function computeDurationLabel(
	start: calendar_v3.Schema$Event["start"],
	end: calendar_v3.Schema$Event["end"],
	allDay: boolean,
): string {
	if (allDay) return "Dia inteiro";
	const s = start?.dateTime ? new Date(start.dateTime).getTime() : null;
	const e = end?.dateTime ? new Date(end.dateTime).getTime() : null;
	if (s === null || e === null) return "1 hora";
	const diffMin = Math.max(0, Math.round((e - s) / 60000));
	if (diffMin < 60) return `${diffMin} min`;
	const hours = diffMin / 60;
	if (Number.isInteger(hours)) return `${hours} hora${hours === 1 ? "" : "s"}`;
	return `${hours.toFixed(1)} horas`;
}

// ----------------------------------------------------------------------------
// Push: Vertech → Google (event mirroring)
// ----------------------------------------------------------------------------

/**
 * Espelha evento local pro Google Calendar primary. Idempotente:
 * - Se evento ainda não tem externalEventId → INSERT remoto
 * - Se já tem → UPDATE remoto
 *
 * Best-effort: erros logados mas não propagam (UX local não pode quebrar
 * por falha remota). Caller decide se trata erro.
 */
export async function pushEventToGoogle(
	organizationId: string,
	userId: string,
	eventId: string,
): Promise<{ ok: boolean; externalEventId?: string; error?: string }> {
	try {
		const localEvent = await db.query.calendarEvent.findFirst({
			where: and(
				eq(calendarEvent.id, eventId),
				eq(calendarEvent.organizationId, organizationId),
			),
		});
		if (!localEvent) return { ok: false, error: "EVENT_NOT_FOUND" };

		const client = await getGoogleCalendarClient(organizationId, userId);
		const body = mapLocalToGoogle(localEvent);

		// conferenceDataVersion=1 é obrigatório quando body inclui conferenceData
		// (createRequest pra Meet). Mandar sempre é seguro — Google ignora se
		// não há mudanças de conference.
		const isMeet = localEvent.eventKind === "meet";

		if (localEvent.externalEventId) {
			const res = await client.events.update({
				calendarId: PRIMARY_CALENDAR,
				eventId: localEvent.externalEventId,
				requestBody: body,
				conferenceDataVersion: isMeet ? 1 : undefined,
			});
			const meet = extractMeetInfo(res.data);
			await db
				.update(calendarEvent)
				.set({
					externalEtag: res.data.etag ?? null,
					externalSyncedAt: new Date(),
					updatedAt: new Date(),
					...(meet
						? {
								meetLink: meet.meetLink,
								conferenceId: meet.conferenceId,
								eventKind: "meet" as const,
							}
						: {}),
				})
				.where(eq(calendarEvent.id, localEvent.id));
			return { ok: true, externalEventId: res.data.id ?? undefined };
		}

		const res = await client.events.insert({
			calendarId: PRIMARY_CALENDAR,
			requestBody: body,
			conferenceDataVersion: isMeet ? 1 : undefined,
		});
		const externalId = res.data.id;
		if (!externalId) return { ok: false, error: "GOOGLE_NO_ID" };
		const meet = extractMeetInfo(res.data);
		await db
			.update(calendarEvent)
			.set({
				externalProvider: "google",
				externalEventId: externalId,
				externalEtag: res.data.etag ?? null,
				externalSyncedAt: new Date(),
				updatedAt: new Date(),
				...(meet
					? {
							meetLink: meet.meetLink,
							conferenceId: meet.conferenceId,
							eventKind: "meet" as const,
						}
					: {}),
			})
			.where(eq(calendarEvent.id, localEvent.id));
		return { ok: true, externalEventId: externalId };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.error(
			{ err: message, organizationId, userId, eventId },
			"[google-calendar] Push falhou",
		);
		return { ok: false, error: message };
	}
}

export async function deleteEventFromGoogle(
	organizationId: string,
	userId: string,
	externalEventId: string,
): Promise<{ ok: boolean; error?: string }> {
	try {
		const client = await getGoogleCalendarClient(organizationId, userId);
		await client.events.delete({
			calendarId: PRIMARY_CALENDAR,
			eventId: externalEventId,
		});
		return { ok: true };
	} catch (err) {
		const status = (err as { code?: number; status?: number }).code ??
			(err as { code?: number; status?: number }).status;
		// 404/410 = já deletado remoto, idempotente
		if (status === 404 || status === 410) {
			return { ok: true };
		}
		const message = err instanceof Error ? err.message : String(err);
		logger.error(
			{ err: message, organizationId, userId, externalEventId },
			"[google-calendar] Delete remoto falhou",
		);
		return { ok: false, error: message };
	}
}

function mapLocalToGoogle(
	local: typeof calendarEvent.$inferSelect,
): calendar_v3.Schema$Event {
	const start = local.startAt;
	const end = computeEndTime(start, local.duration, local.allDay);
	const body: calendar_v3.Schema$Event = {
		summary: local.title,
		description: local.description ?? undefined,
		location: local.location ?? undefined,
	};
	if (local.allDay) {
		body.start = { date: toDateOnly(start) };
		body.end = { date: toDateOnly(end) };
	} else {
		body.start = { dateTime: start.toISOString() };
		body.end = { dateTime: end.toISOString() };
	}
	if (local.recurrenceRule) {
		body.recurrence = [
			local.recurrenceRule.startsWith("RRULE:")
				? local.recurrenceRule
				: `RRULE:${local.recurrenceRule}`,
		];
	}
	if (local.externalAttendees && local.externalAttendees.length > 0) {
		body.attendees = local.externalAttendees.map((a) => ({
			email: a.email,
			displayName: a.name,
			responseStatus:
				a.status === "accepted"
					? "accepted"
					: a.status === "declined"
						? "declined"
						: "needsAction",
		}));
	}
	// Google Meet: pede criação de videochamada se eventKind=meet e ainda não tem
	// conferenceId. Quando já tem (update subsequente), o Google preserva o link
	// existente — não recriamos.
	if (local.eventKind === "meet" && !local.conferenceId) {
		body.conferenceData = {
			createRequest: {
				// requestId é arbitrário pero único por solicitação. O Google usa
				// pra dedupe — eventId local serve bem (estável + único na org).
				requestId: `vertech-${local.id}`,
				conferenceSolutionKey: { type: "hangoutsMeet" },
			},
		};
	}
	return body;
}

/**
 * Extrai info de Meet de um evento Google. Retorna null se evento não tem
 * videochamada (ou não é Meet — outros providers como Zoom têm shape diferente).
 */
function extractMeetInfo(
	g: calendar_v3.Schema$Event,
): { meetLink: string; conferenceId: string } | null {
	const conf = g.conferenceData;
	if (!conf) return null;
	const conferenceId = conf.conferenceId ?? null;
	if (!conferenceId) return null;
	const videoEntry = (conf.entryPoints ?? []).find(
		(e) => e.entryPointType === "video" && e.uri,
	);
	if (!videoEntry?.uri) return null;
	return { meetLink: videoEntry.uri, conferenceId };
}

function computeEndTime(start: Date, duration: string, allDay: boolean): Date {
	if (allDay) {
		// All-day Google: end.date é EXCLUSIVE → start + 1 dia
		const d = new Date(start);
		d.setDate(d.getDate() + 1);
		return d;
	}
	const lower = duration.toLowerCase().trim();
	let minutes = 60;
	const minMatch = lower.match(/(\d+)\s*min/);
	const hourMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*hora/);
	if (minMatch) {
		minutes = parseInt(minMatch[1], 10);
	} else if (hourMatch) {
		const hours = parseFloat(hourMatch[1].replace(",", "."));
		minutes = Math.round(hours * 60);
	}
	if (lower.includes("dia inteiro")) minutes = 24 * 60;
	return new Date(start.getTime() + minutes * 60 * 1000);
}

function toDateOnly(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

// ----------------------------------------------------------------------------
// Initial / pending push: eventos locais sem externalEventId
// ----------------------------------------------------------------------------

/**
 * Empurra todos eventos locais ainda sem `externalEventId` (criados antes
 * da conexão OAuth ou em janelas de falha de sync). Limita janela
 * temporal pra evitar spam pra Google.
 */
export async function pushPendingLocalEvents(
	organizationId: string,
	userId: string,
): Promise<{ pushed: number; failed: number }> {
	const now = Date.now();
	const cutoffPast = new Date(now - PULL_PAST_DAYS * 24 * 60 * 60 * 1000);
	const cutoffFuture = new Date(
		now + PULL_FUTURE_DAYS * 24 * 60 * 60 * 1000,
	);
	const pending = await db.query.calendarEvent.findMany({
		where: and(
			eq(calendarEvent.organizationId, organizationId),
			eq(calendarEvent.isSandbox, false),
		),
		columns: { id: true, externalEventId: true, startAt: true },
	});
	const filtered = pending.filter(
		(p) =>
			!p.externalEventId &&
			p.startAt >= cutoffPast &&
			p.startAt <= cutoffFuture,
	);
	let pushed = 0;
	let failed = 0;
	for (const p of filtered) {
		const res = await pushEventToGoogle(organizationId, userId, p.id);
		if (res.ok) pushed += 1;
		else failed += 1;
	}
	return { pushed, failed };
}

// ----------------------------------------------------------------------------
// Combined sync: pull + push pendentes
// ----------------------------------------------------------------------------

export async function runFullSync(
	organizationId: string,
	userId: string,
	options: { force?: boolean } = {},
): Promise<SyncResult> {
	const pullResult = await syncCalendarPull(organizationId, userId, options);
	if (!pullResult.ok) return pullResult;
	const pushResult = await pushPendingLocalEvents(organizationId, userId);
	return {
		...pullResult,
		pushed: pushResult.pushed,
	};
}
