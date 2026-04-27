import "server-only";
import {
	and,
	asc,
	contact,
	db,
	desc,
	eq,
	gt,
	inArray,
	like,
	sql,
	whatsappInstance,
} from "@repo/database";
import { cache } from "react";

export type WhatsAppInstanceRow = {
	id: string;
	name: string;
	phoneNumber: string | null;
	status:
		| "PENDING"
		| "CONNECTING"
		| "CONNECTED"
		| "DISCONNECTED"
		| "LOGGED_OUT"
		| "ERROR";
	lastConnectedAt: Date | null;
	lastError: string | null;
	createdAt: Date;
};

export const listInstancesForOrg = cache(
	async (organizationId: string): Promise<WhatsAppInstanceRow[]> => {
		return db
			.select({
				id: whatsappInstance.id,
				name: whatsappInstance.name,
				phoneNumber: whatsappInstance.phoneNumber,
				status: whatsappInstance.status,
				lastConnectedAt: whatsappInstance.lastConnectedAt,
				lastError: whatsappInstance.lastError,
				createdAt: whatsappInstance.createdAt,
			})
			.from(whatsappInstance)
			.where(eq(whatsappInstance.organizationId, organizationId))
			.orderBy(asc(whatsappInstance.createdAt));
	},
);

export type InstanceStatusSnapshot = {
	id: string;
	status: WhatsAppInstanceRow["status"];
	phoneNumber: string | null;
	qrCode: string | null;
	lastError: string | null;
};

/**
 * Retorna true se a org tem pelo menos uma instância "viva" (conectada ou
 * tentando reconectar). Usado pelo chat pra mostrar empty state quando o
 * cliente não tem WhatsApp configurado ou desconectou tudo.
 */
export const hasActiveWhatsAppInstance = cache(
	async (organizationId: string): Promise<boolean> => {
		const [row] = await db
			.select({ id: whatsappInstance.id })
			.from(whatsappInstance)
			.where(
				and(
					eq(whatsappInstance.organizationId, organizationId),
					inArray(whatsappInstance.status, [
						"CONNECTED",
						"CONNECTING",
						"DISCONNECTED",
					]),
				),
			)
			.limit(1);
		return !!row;
	},
);

export type WhatsAppSyncStatus = {
	active: boolean;
	contactsCount: number;
	lastHistorySyncAt: Date | null;
	secondsSinceLastBatch: number | null;
};

/**
 * Status do sync de history do WhatsApp pra renderizar banner UI.
 * Sync é considerado "ativo" quando o último batch chegou nos últimos 30s.
 * UI faz polling desse endpoint enquanto active=true.
 *
 * NÃO é cached — precisa ser fresh a cada poll do client.
 */
export async function getWhatsAppSyncStatus(
	organizationId: string,
): Promise<WhatsAppSyncStatus> {
	const [inst] = await db
		.select({ lastHistorySyncAt: whatsappInstance.lastHistorySyncAt })
		.from(whatsappInstance)
		.where(eq(whatsappInstance.organizationId, organizationId))
		.orderBy(desc(whatsappInstance.lastConnectedAt))
		.limit(1);

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(contact)
		.where(
			and(
				eq(contact.organizationId, organizationId),
				like(contact.source, "whatsapp%"),
			),
		);

	const lastBatch = inst?.lastHistorySyncAt ?? null;
	const secondsSinceLastBatch = lastBatch
		? Math.floor((Date.now() - lastBatch.getTime()) / 1000)
		: null;
	const active =
		secondsSinceLastBatch !== null && secondsSinceLastBatch < 30;

	return {
		active,
		contactsCount: count,
		lastHistorySyncAt: lastBatch,
		secondsSinceLastBatch,
	};
}

export const getInstanceStatusSnapshot = cache(
	async (
		instanceId: string,
		organizationId: string,
	): Promise<InstanceStatusSnapshot | null> => {
		const [row] = await db
			.select({
				id: whatsappInstance.id,
				status: whatsappInstance.status,
				phoneNumber: whatsappInstance.phoneNumber,
				qrCode: whatsappInstance.lastQRCode,
				lastError: whatsappInstance.lastError,
				organizationId: whatsappInstance.organizationId,
			})
			.from(whatsappInstance)
			.where(eq(whatsappInstance.id, instanceId))
			.limit(1);

		if (!row) return null;
		if (row.organizationId !== organizationId) return null;
		return {
			id: row.id,
			status: row.status,
			phoneNumber: row.phoneNumber,
			qrCode: row.qrCode,
			lastError: row.lastError,
		};
	},
);
