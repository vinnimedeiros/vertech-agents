import "server-only";
import {
	agent,
	and,
	db,
	eq,
	inArray,
	ne,
	whatsappInstance,
} from "@repo/database";
import { cache } from "react";

export type AvailableInstance = {
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
};

/**
 * Lista instancias WhatsApp da org disponiveis pra vincular a um agente.
 *
 * Criterios:
 * 1. Instancia pertence a org
 * 2. Esta em estado conectavel (CONNECTED, CONNECTING, DISCONNECTED)
 *    — LOGGED_OUT e ERROR sao excluidos (user precisa reconectar primeiro)
 * 3. Nao vinculada a nenhum outro agente ACTIVE ou PAUSED
 *    (agente DRAFT ou ARCHIVED nao "ocupa" a instancia)
 * 4. OU vinculada ao proprio agente passado (pra mostrar como "atual")
 */
export const getAvailableWhatsAppInstances = cache(
	async (
		organizationId: string,
		currentAgentId?: string,
	): Promise<AvailableInstance[]> => {
		// Passo 1: encontra instancias "ocupadas" por outros agentes ativos/pausados
		const occupiedRows = await db
			.select({ instanceId: agent.whatsappInstanceId })
			.from(agent)
			.where(
				and(
					eq(agent.organizationId, organizationId),
					inArray(agent.status, ["ACTIVE", "PAUSED"]),
					currentAgentId ? ne(agent.id, currentAgentId) : undefined,
				),
			);

		const occupiedIds = occupiedRows
			.map((r) => r.instanceId)
			.filter((id): id is string => !!id);

		// Passo 2: lista instancias da org em estado conectavel
		const instances = await db
			.select({
				id: whatsappInstance.id,
				name: whatsappInstance.name,
				phoneNumber: whatsappInstance.phoneNumber,
				status: whatsappInstance.status,
			})
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
			);

		// Passo 3: filtra instancias ocupadas, mas mantem a atual do agente
		return instances.filter(
			(i) => !occupiedIds.includes(i.id) || i.id === currentAgentId,
		);
	},
);

/**
 * Busca os dados de uma instancia especifica (pra renderizar no estado
 * "vinculado" quando a instancia do agente pode nao estar na lista de
 * disponiveis).
 */
export const getWhatsAppInstanceById = cache(
	async (
		organizationId: string,
		instanceId: string,
	): Promise<AvailableInstance | null> => {
		const [row] = await db
			.select({
				id: whatsappInstance.id,
				name: whatsappInstance.name,
				phoneNumber: whatsappInstance.phoneNumber,
				status: whatsappInstance.status,
				organizationId: whatsappInstance.organizationId,
			})
			.from(whatsappInstance)
			.where(eq(whatsappInstance.id, instanceId))
			.limit(1);

		if (!row || row.organizationId !== organizationId) {
			return null;
		}
		return {
			id: row.id,
			name: row.name,
			phoneNumber: row.phoneNumber,
			status: row.status,
		};
	},
);
