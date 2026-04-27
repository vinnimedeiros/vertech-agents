import { db, eq, inArray, whatsappInstance } from "@repo/database";
import pino from "pino";
import { WhatsAppInstance } from "./instance";

const logger = pino({ level: "warn" });

// Bump após upgrade Baileys 6.7.9 → 7.0.0-rc.9 — instances v6 cacheadas no
// globalThis ficam stale após reload do código v7, garantir Map fresco.
const GLOBAL_KEY = "__vertechBaileysManager_v7";

class BaileysManager {
	private instances = new Map<string, WhatsAppInstance>();
	private booted = false;

	/**
	 * Inicia (ou recupera, se já iniciada) a conexão Baileys pra uma instance.
	 * Ideal pra ser chamada quando um usuário clica "Conectar" no UI.
	 */
	async startInstance(instanceId: string): Promise<WhatsAppInstance> {
		const existing = this.instances.get(instanceId);
		if (existing && existing.isConnected()) return existing;

		const inst = existing ?? new WhatsAppInstance(instanceId);
		this.instances.set(instanceId, inst);
		await inst.connect();
		return inst;
	}

	getInstance(instanceId: string): WhatsAppInstance | undefined {
		return this.instances.get(instanceId);
	}

	/**
	 * Garante que a instância está na memória e conectada. Se não está, inicia.
	 * Aguarda até `timeoutMs` pra ela ficar conectada (default 10s).
	 * Lança se expirar ou se a instance está LOGGED_OUT/ERROR no DB.
	 */
	async ensureReady(
		instanceId: string,
		timeoutMs = 10000,
	): Promise<WhatsAppInstance> {
		const existing = this.instances.get(instanceId);
		if (existing && existing.isConnected()) return existing;

		// Dispara o start (idempotente se já estava iniciando)
		this.startInstance(instanceId).catch(() => {});

		const start = Date.now();
		while (Date.now() - start < timeoutMs) {
			const inst = this.instances.get(instanceId);
			if (inst?.isConnected()) return inst;
			await new Promise((r) => setTimeout(r, 250));
		}
		throw new Error(
			`Instance ${instanceId} não ficou pronta em ${timeoutMs}ms`,
		);
	}

	/**
	 * Logout e remoção. A próxima conexão precisa de QR novo.
	 */
	async stopInstance(instanceId: string): Promise<void> {
		const inst = this.instances.get(instanceId);
		if (inst) {
			await inst.disconnect();
			this.instances.delete(instanceId);
		}
	}

	/**
	 * Fecha socket sem logout — a sessão fica no DB e pode reconectar depois
	 * (ex. processo Node reiniciando).
	 */
	async destroyInstance(instanceId: string): Promise<void> {
		const inst = this.instances.get(instanceId);
		if (inst) {
			await inst.destroy();
			this.instances.delete(instanceId);
		}
	}

	/**
	 * Chamado uma vez por processo Node — reergue todas as instâncias que
	 * estavam CONNECTED ou DISCONNECTED (em teoria o authState ainda é válido).
	 * Idempotente: chamadas subsequentes não fazem nada.
	 */
	async bootAll(): Promise<void> {
		if (this.booted) return;
		this.booted = true;

		const rows = await db
			.select({ id: whatsappInstance.id })
			.from(whatsappInstance)
			.where(
				inArray(whatsappInstance.status, ["CONNECTED", "DISCONNECTED"]),
			);

		for (const { id } of rows) {
			this.startInstance(id).catch((err) => {
				logger.error({ err, instanceId: id }, "Boot instance failed");
			});
		}
	}
}

// Singleton preservado no globalThis pra sobreviver ao HMR do Next/Turbopack.
// Sem isso, cada recompile criaria uma nova Map de instances e conflitaria
// a sessão ativa do WhatsApp ("conflict:replaced").
const g = globalThis as Record<string, unknown>;
export const baileysManager: BaileysManager =
	(g[GLOBAL_KEY] as BaileysManager | undefined) ?? new BaileysManager();
g[GLOBAL_KEY] = baileysManager;
