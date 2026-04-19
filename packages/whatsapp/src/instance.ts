import type { Boom } from "@hapi/boom";
import { db, eq, whatsappInstance } from "@repo/database";
import makeWASocket, {
	DisconnectReason,
	fetchLatestBaileysVersion,
	type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { useDatabaseAuthState } from "./auth-state";
import { syncContactsFromWhatsApp } from "./contacts-sync";
import { handleIncomingMessage } from "./message-handler";
import { handleMessageUpdate } from "./receipt-handler";

const logger = pino({ level: "warn" });

/**
 * Wrapper pra uma conexão individual com WhatsApp (um número por instância).
 *
 * Uso típico:
 *   const inst = new WhatsAppInstance("cm_xxx");
 *   await inst.connect();
 *   // ... mensagens começam a chegar via messages.upsert
 *   await inst.disconnect(); // logout completo
 */
export class WhatsAppInstance {
	private sock: WASocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(public readonly instanceId: string) {}

	async connect(): Promise<void> {
		const { state, saveCreds } = await useDatabaseAuthState(this.instanceId);
		const { version } = await fetchLatestBaileysVersion();

		this.sock = makeWASocket({
			version,
			auth: state,
			logger,
			markOnlineOnConnect: false,
			// Sync completo ligado: traz lista de contatos da agenda + chats
			// recentes (~14 dias) via evento `messaging-history.set`. Sem isso
			// só recebemos contatos que interagiram conosco.
			syncFullHistory: true,
			browser: ["Vertech Agents", "Chrome", "1.0.0"],
		});

		this.sock.ev.on("creds.update", saveCreds);

		this.sock.ev.on("connection.update", async (update) => {
			const { connection, lastDisconnect, qr } = update;

			if (qr) {
				await db
					.update(whatsappInstance)
					.set({
						status: "CONNECTING",
						lastQRCode: qr,
						lastError: null,
						updatedAt: new Date(),
					})
					.where(eq(whatsappInstance.id, this.instanceId));
			}

			if (connection === "open") {
				const phoneNumber = this.sock?.user?.id?.split(":")[0] ?? null;
				await db
					.update(whatsappInstance)
					.set({
						status: "CONNECTED",
						lastConnectedAt: new Date(),
						phoneNumber,
						lastQRCode: null,
						lastError: null,
						updatedAt: new Date(),
					})
					.where(eq(whatsappInstance.id, this.instanceId));
			}

			if (connection === "close") {
				const boom = lastDisconnect?.error as Boom | undefined;
				const statusCode = boom?.output?.statusCode;
				const loggedOut = statusCode === DisconnectReason.loggedOut;
				// 440 = connectionReplaced — outra sessão assumiu.
				// Parar retry pra não entrar em loop e não "roubar" de volta a sessão.
				const replaced =
					statusCode === DisconnectReason.connectionReplaced ||
					/conflict/i.test(lastDisconnect?.error?.message ?? "");

				await db
					.update(whatsappInstance)
					.set({
						status: loggedOut || replaced ? "LOGGED_OUT" : "DISCONNECTED",
						lastError: lastDisconnect?.error?.message ?? null,
						updatedAt: new Date(),
					})
					.where(eq(whatsappInstance.id, this.instanceId));

				this.sock = null;

				if (!loggedOut && !replaced) {
					this.scheduleReconnect();
				}
			}
		});

		this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
			if (type !== "notify") return;
			for (const msg of messages) {
				try {
					await handleIncomingMessage(this.instanceId, msg, this.sock!);
				} catch (err) {
					logger.error(
						{ err, msgId: msg.key.id, instanceId: this.instanceId },
						"Failed to handle incoming message",
					);
				}
			}
		});

		// Recibos de entrega/leitura (propaga checks ✓ → ✓✓ → ✓✓ azul)
		this.sock.ev.on("messages.update", async (updates) => {
			for (const update of updates) {
				try {
					await handleMessageUpdate(update);
				} catch (err) {
					logger.error(
						{ err, msgId: update.key.id, instanceId: this.instanceId },
						"Failed to handle message update",
					);
				}
			}
		});

		// Sincronização da lista de contatos do celular conectado
		const onContacts = async (
			contacts: Array<{
				id: string;
				name?: string;
				notify?: string;
				verifiedName?: string;
			}>,
		) => {
			const [row] = await db
				.select({ organizationId: whatsappInstance.organizationId })
				.from(whatsappInstance)
				.where(eq(whatsappInstance.id, this.instanceId))
				.limit(1);
			if (!row) return;
			try {
				const { inserted, updated } = await syncContactsFromWhatsApp(
					row.organizationId,
					contacts,
				);
				if (inserted + updated > 0) {
					logger.info(
						{ instanceId: this.instanceId, inserted, updated },
						"contacts synced from WhatsApp",
					);
				}
			} catch (err) {
				logger.error(
					{ err, instanceId: this.instanceId },
					"Failed to sync contacts",
				);
			}
		};

		this.sock.ev.on("contacts.upsert", onContacts);
		this.sock.ev.on("contacts.update", onContacts as any);

		// Dump inicial de histórico (dispara após conexão quando syncFullHistory
		// está ligado). Traz a agenda completa de contatos + chats recentes.
		this.sock.ev.on("messaging-history.set", async (payload: any) => {
			try {
				const contacts = payload?.contacts ?? [];
				if (contacts.length === 0) return;
				logger.info(
					{
						instanceId: this.instanceId,
						contactsCount: contacts.length,
						chatsCount: payload?.chats?.length ?? 0,
						isLatest: payload?.isLatest,
					},
					"messaging-history.set received",
				);
				await onContacts(contacts);
			} catch (err) {
				logger.error(
					{ err, instanceId: this.instanceId },
					"Failed to process messaging-history.set",
				);
			}
		});
	}

	private scheduleReconnect() {
		if (this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect().catch((err) => {
				logger.error(
					{ err, instanceId: this.instanceId },
					"Reconnect failed",
				);
			});
		}, 5000);
	}

	async disconnect(): Promise<void> {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		try {
			await this.sock?.logout();
		} catch {
			// logout pode falhar se já desconectado — OK
		}
		this.sock = null;
	}

	/**
	 * Fecha socket sem fazer logout — usado pra teardown gracioso.
	 * A sessão persiste e pode reconectar depois.
	 */
	async destroy(): Promise<void> {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.sock?.end(undefined);
		this.sock = null;
	}

	getSock(): WASocket {
		if (!this.sock) {
			throw new Error(
				`Instance ${this.instanceId} não está conectada`,
			);
		}
		return this.sock;
	}

	isConnected(): boolean {
		return this.sock !== null;
	}
}
