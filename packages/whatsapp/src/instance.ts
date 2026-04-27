import type { Boom } from "@hapi/boom";
import { and, contact, db, eq, isNull, whatsappInstance } from "@repo/database";
import makeWASocket, {
	DisconnectReason,
	fetchLatestBaileysVersion,
	type SignalRepositoryWithLIDStore,
	type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { useDatabaseAuthState } from "./auth-state";
import { syncContactsFromWhatsApp } from "./contacts-sync";
import { normalizeLidFromJid, normalizePhoneFromJid } from "./jid-utils";
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
	private lidResolverTimer: ReturnType<typeof setInterval> | null = null;

	constructor(public readonly instanceId: string) {}

	async connect(): Promise<void> {
		const { state, saveCreds } = await useDatabaseAuthState(this.instanceId);
		const { version } = await fetchLatestBaileysVersion();

		this.sock = makeWASocket({
			version,
			auth: state,
			logger,
			markOnlineOnConnect: false,
			// Sync completo: traz lista de contatos da agenda + chats recentes
			// via evento `messaging-history.set`. Em v7 contatos LID-only são
			// tratados corretamente pelo contacts-sync.ts e o resolver proativo
			// `getPNForLID` chamado após connection popula phone retroativo.
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
				// v7: sock.user é Contact com lid + phoneNumber separados.
				// Persistimos APENAS phoneNumber — nunca LID — pra evitar mostrar
				// "número" LID na UI quando o contato é Anonymous mode.
				const phoneNumber = this.sock?.user?.phoneNumber ?? null;
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

				// Resolve LID → phone proativo pros contatos LID-only existentes.
				// Roda em background — não bloqueia conexão.
				this.resolveLidPhonesBackground().catch((err) => {
					logger.error(
						{ err, instanceId: this.instanceId },
						"resolveLidPhonesBackground failed",
					);
				});
				// Re-roda periodicamente. WhatsApp pode revelar mappings novos
				// ao longo do tempo conforme contatos interagem ou servidor
				// sincroniza. 60s é razoável — o lookup é local (signal store).
				if (!this.lidResolverTimer) {
					this.lidResolverTimer = setInterval(() => {
						this.resolveLidPhonesBackground().catch((err) => {
							logger.warn(
								{ err, instanceId: this.instanceId },
								"resolveLidPhonesBackground periodic failed",
							);
						});
					}, 60_000);
				}
			}

			if (connection === "close") {
				const boom = lastDisconnect?.error as Boom | undefined;
				const statusCode = boom?.output?.statusCode;
				const loggedOut = statusCode === DisconnectReason.loggedOut;
				const replaced =
					statusCode === DisconnectReason.connectionReplaced ||
					/conflict/i.test(lastDisconnect?.error?.message ?? "");
				// v7: 403 forbidden = ban ou rate limit. Não retry.
				const forbidden = statusCode === DisconnectReason.forbidden;
				const fatal = loggedOut || replaced || forbidden;

				await db
					.update(whatsappInstance)
					.set({
						status: fatal ? "LOGGED_OUT" : "DISCONNECTED",
						lastError: lastDisconnect?.error?.message ?? null,
						updatedAt: new Date(),
					})
					.where(eq(whatsappInstance.id, this.instanceId));

				this.sock = null;

				if (!fatal) {
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
				lid?: string;
				phoneNumber?: string;
			}>,
		): Promise<{ inserted: number; updated: number } | null> => {
			const [row] = await db
				.select({ organizationId: whatsappInstance.organizationId })
				.from(whatsappInstance)
				.where(eq(whatsappInstance.id, this.instanceId))
				.limit(1);
			if (!row) return null;
			try {
				const { inserted, updated } = await syncContactsFromWhatsApp(
					row.organizationId,
					contacts,
				);
				if (inserted + updated > 0) {
					console.info(
						`[whatsapp:contacts-sync] inserted=${inserted} updated=${updated} batch=${contacts.length}`,
					);
				}
				return { inserted, updated };
			} catch (err) {
				logger.error(
					{ err, instanceId: this.instanceId },
					"Failed to sync contacts",
				);
				return null;
			}
		};

		this.sock.ev.on("contacts.upsert", onContacts);
		this.sock.ev.on("contacts.update", onContacts as any);

		// v7: WhatsApp revela mapeamento LID↔phoneNumber em tempo real conforme
		// vai descobrindo. Aqui populamos `contact.phone` retroativo nos
		// contatos que entraram LID-only (Anonymous mode).
		this.sock.ev.on("lid-mapping.update", async (mapping) => {
			try {
				const { lid, pn } = mapping;
				if (!lid || !pn) return;
				// Strip @domínio e :deviceId antes de pegar dígitos.
				// Sem isso o `:0` do device fica colado no fim do número.
				const phoneDigits = normalizePhoneFromJid(pn);
				const lidNormalized = normalizeLidFromJid(lid);
				if (!phoneDigits || !lidNormalized) return;

				const [row] = await db
					.select({ organizationId: whatsappInstance.organizationId })
					.from(whatsappInstance)
					.where(eq(whatsappInstance.id, this.instanceId))
					.limit(1);
				if (!row) return;

				await db
					.update(contact)
					.set({ phone: phoneDigits, updatedAt: new Date() })
					.where(
						and(
							eq(contact.organizationId, row.organizationId),
							eq(contact.lid, lidNormalized),
							isNull(contact.phone),
						),
					);
			} catch (err) {
				logger.error(
					{ err, instanceId: this.instanceId },
					"Failed to handle lid-mapping.update",
				);
			}
		});

		// Dump inicial de histórico (dispara após conexão quando syncFullHistory
		// está ligado). Traz a lista de chats existentes do WhatsApp + contatos
		// derivados desses chats. Servidor envia em chunks assíncronos — cada
		// `messaging-history.set` é um batch parcial. Pode levar minutos pra
		// volume grande de chats (WA Business com muito histórico).
		this.sock.ev.on("messaging-history.set", async (payload: any) => {
			try {
				const contacts = payload?.contacts ?? [];
				const chatsCount = payload?.chats?.length ?? 0;
				const messagesCount = payload?.messages?.length ?? 0;
				const syncType = payload?.syncType ?? null;
				const progress = payload?.progress ?? null;
				const isLatest = payload?.isLatest;

				console.info(
					`[whatsapp:history-sync] batch recebido — ` +
						`syncType=${syncType} progress=${progress}% ` +
						`chats=${chatsCount} contacts=${contacts.length} ` +
						`messages=${messagesCount} isLatest=${isLatest}`,
				);

				// Marca timestamp do batch — UI lê pra renderizar banner
				// "Sincronizando" enquanto batches chegam.
				await db
					.update(whatsappInstance)
					.set({ lastHistorySyncAt: new Date(), updatedAt: new Date() })
					.where(eq(whatsappInstance.id, this.instanceId));

				if (contacts.length === 0) return;
				const result = await onContacts(contacts);
				if (result) {
					console.info(
						`[whatsapp:history-sync] batch processado — ` +
							`inserted=${result.inserted} updated=${result.updated}`,
					);
				}
			} catch (err) {
				logger.error(
					{ err, instanceId: this.instanceId },
					"Failed to process messaging-history.set",
				);
			}
		});
	}

	/**
	 * Pra cada contato LID-only da org, tenta resolver o telefone real via
	 * `signalRepository.lidMapping.getPNForLID`. O store local do Baileys
	 * pode ter o mapping em cache (recém-recebido do servidor WhatsApp via
	 * usync) sem precisar de evento `lid-mapping.update` explícito.
	 *
	 * Roda após cada `connection.update === "open"`. Idempotente — contatos
	 * já resolvidos são pulados.
	 */
	private async resolveLidPhonesBackground(): Promise<void> {
		const sock = this.sock;
		if (!sock) return;
		// Baileys v7 expõe signalRepository internamente mas o type WASocket
		// não promove o field. Cast pra shape conhecido em vez de `any` —
		// mantém type-safety dentro do helper.
		const sockWithRepo = sock as WASocket & {
			signalRepository?: SignalRepositoryWithLIDStore;
		};
		const lidMapping = sockWithRepo.signalRepository?.lidMapping;
		if (!lidMapping?.getPNForLID) return;

		const [row] = await db
			.select({ organizationId: whatsappInstance.organizationId })
			.from(whatsappInstance)
			.where(eq(whatsappInstance.id, this.instanceId))
			.limit(1);
		if (!row) return;

		const orphanContacts = await db
			.select({ id: contact.id, lid: contact.lid })
			.from(contact)
			.where(
				and(
					eq(contact.organizationId, row.organizationId),
					isNull(contact.phone),
				),
			);

		let resolved = 0;
		for (const c of orphanContacts) {
			if (!c.lid) continue;
			try {
				// LID precisa de domínio @lid pro lookup no signal store
				const lidJid = c.lid.includes("@") ? c.lid : `${c.lid}@lid`;
				const pn: string | null = await lidMapping.getPNForLID(lidJid);
				if (!pn) continue;
				// Strip @domínio e :deviceId antes de extrair dígitos.
				const digits = normalizePhoneFromJid(pn);
				if (!digits) continue;
				await db
					.update(contact)
					.set({ phone: digits, updatedAt: new Date() })
					.where(eq(contact.id, c.id));
				resolved++;
			} catch (err) {
				// Falha individual não derruba o batch
				logger.warn(
					{ err, contactId: c.id, lid: c.lid },
					"getPNForLID falhou pra contato",
				);
			}
		}

		if (resolved > 0) {
			logger.info(
				{ instanceId: this.instanceId, resolved, total: orphanContacts.length },
				"resolveLidPhonesBackground concluído",
			);
		}
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
		if (this.lidResolverTimer) {
			clearInterval(this.lidResolverTimer);
			this.lidResolverTimer = null;
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
		if (this.lidResolverTimer) {
			clearInterval(this.lidResolverTimer);
			this.lidResolverTimer = null;
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
