import "server-only";
import {
	and,
	asc,
	db,
	eq,
	inArray,
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
