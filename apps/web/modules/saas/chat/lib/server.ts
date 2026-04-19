import "server-only";
import {
	and,
	asc,
	contact,
	conversation,
	db,
	desc,
	eq,
	ilike,
	lead,
	lt,
	message,
	or,
	pipeline,
	pipelineStage,
	sql,
} from "@repo/database";
import { cache } from "react";

// ============================================================
// Tipos
// ============================================================

export type ChatChannel =
	| "WHATSAPP"
	| "EMAIL"
	| "SMS"
	| "WEBCHAT"
	| "INTERNAL";
export type ChatStatus =
	| "NEW"
	| "ACTIVE"
	| "WAITING"
	| "RESOLVED"
	| "ARCHIVED";
export type SenderType = "CONTACT" | "USER" | "AGENT" | "SYSTEM";
export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageType =
	| "TEXT"
	| "IMAGE"
	| "AUDIO"
	| "VIDEO"
	| "DOCUMENT"
	| "STICKER"
	| "LOCATION"
	| "CONTACT"
	| "TEMPLATE"
	| "SYSTEM";
export type MessageStatus =
	| "PENDING"
	| "SENT"
	| "DELIVERED"
	| "READ"
	| "FAILED";

export type ConversationListItem = {
	id: string;
	contactId: string;
	channel: ChatChannel;
	status: ChatStatus;
	lastMessageAt: Date | null;
	lastMessagePreview: string | null;
	unreadCount: number;
	assignedUserId: string | null;
	isAIEnabled: boolean;
	pinnedAt: Date | null;
	contact: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		company: string | null;
		photoUrl: string | null;
	};
};

export type ConversationDetail = ConversationListItem & {
	organizationId: string;
	assignedAgentId: string | null;
	channelInstanceId: string | null;
};

export type ChatMessage = {
	id: string;
	conversationId: string;
	senderType: SenderType;
	senderId: string | null;
	senderName: string | null;
	senderAvatar: string | null;
	direction: MessageDirection;
	type: MessageType;
	status: MessageStatus;
	text: string | null;
	mediaUrl: string | null;
	mediaMimeType: string | null;
	mediaFileName: string | null;
	mediaSize: number | null;
	durationSeconds: number | null;
	caption: string | null;
	createdAt: Date;
};

// ============================================================
// Queries
// ============================================================

export const listConversationsForOrg = cache(
	async (
		organizationId: string,
		options?: {
			statusFilter?: ChatStatus[] | null;
			search?: string | null;
		},
	): Promise<ConversationListItem[]> => {
		const whereClauses = [eq(conversation.organizationId, organizationId)];

		if (options?.statusFilter && options.statusFilter.length > 0) {
			whereClauses.push(
				or(
					...options.statusFilter.map((s) => eq(conversation.status, s)),
				) as any,
			);
		}

		if (options?.search?.trim()) {
			const q = `%${options.search.trim()}%`;
			whereClauses.push(
				or(
					ilike(contact.name, q),
					ilike(contact.phone, q),
					ilike(contact.email, q),
					ilike(conversation.lastMessagePreview, q),
				) as any,
			);
		}

		const rows = await db
			.select({
				id: conversation.id,
				contactId: conversation.contactId,
				channel: conversation.channel,
				status: conversation.status,
				lastMessageAt: conversation.lastMessageAt,
				lastMessagePreview: conversation.lastMessagePreview,
				unreadCount: conversation.unreadCount,
				assignedUserId: conversation.assignedUserId,
				isAIEnabled: conversation.isAIEnabled,
				pinnedAt: conversation.pinnedAt,
				contact: {
					id: contact.id,
					name: contact.name,
					phone: contact.phone,
					email: contact.email,
					company: contact.company,
					photoUrl: contact.photoUrl,
				},
			})
			.from(conversation)
			.innerJoin(contact, eq(conversation.contactId, contact.id))
			.where(and(...whereClauses))
			.orderBy(
				// Fixadas primeiro (NULLS LAST), depois por última mensagem
				sql`${conversation.pinnedAt} DESC NULLS LAST`,
				desc(conversation.lastMessageAt),
				desc(conversation.createdAt),
			);

		return rows;
	},
);

export const getConversationDetail = cache(
	async (conversationId: string): Promise<ConversationDetail | null> => {
		const [row] = await db
			.select({
				id: conversation.id,
				organizationId: conversation.organizationId,
				contactId: conversation.contactId,
				channel: conversation.channel,
				channelInstanceId: conversation.channelInstanceId,
				status: conversation.status,
				lastMessageAt: conversation.lastMessageAt,
				lastMessagePreview: conversation.lastMessagePreview,
				unreadCount: conversation.unreadCount,
				assignedUserId: conversation.assignedUserId,
				assignedAgentId: conversation.assignedAgentId,
				isAIEnabled: conversation.isAIEnabled,
				pinnedAt: conversation.pinnedAt,
				contact: {
					id: contact.id,
					name: contact.name,
					phone: contact.phone,
					email: contact.email,
					company: contact.company,
					photoUrl: contact.photoUrl,
				},
			})
			.from(conversation)
			.innerJoin(contact, eq(conversation.contactId, contact.id))
			.where(eq(conversation.id, conversationId))
			.limit(1);

		return row ?? null;
	},
);

export const listMessages = cache(
	async (
		conversationId: string,
		options?: { limit?: number; beforeId?: string | null },
	): Promise<ChatMessage[]> => {
		const limit = options?.limit ?? 50;
		const whereClauses = [eq(message.conversationId, conversationId)];

		if (options?.beforeId) {
			// Cursor: pega mensagens anteriores à beforeId (ordenadas por createdAt)
			const [cursor] = await db
				.select({ createdAt: message.createdAt })
				.from(message)
				.where(eq(message.id, options.beforeId))
				.limit(1);
			if (cursor) {
				whereClauses.push(lt(message.createdAt, cursor.createdAt));
			}
		}

		const rows = await db
			.select()
			.from(message)
			.where(and(...whereClauses))
			.orderBy(desc(message.createdAt))
			.limit(limit);

		// Retorna em ordem cronológica (antiga → nova) pra render top-down
		return rows.reverse().map((r) => ({
			id: r.id,
			conversationId: r.conversationId,
			senderType: r.senderType,
			senderId: r.senderId,
			senderName: r.senderName,
			senderAvatar: r.senderAvatar,
			direction: r.direction,
			type: r.type,
			status: r.status,
			text: r.text,
			mediaUrl: r.mediaUrl,
			mediaMimeType: r.mediaMimeType,
			mediaFileName: r.mediaFileName,
			mediaSize: r.mediaSize,
			durationSeconds: r.durationSeconds,
			caption: r.caption,
			createdAt: r.createdAt,
		}));
	},
);

export type ContactForPanel = {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	company: string | null;
	photoUrl: string | null;
	isBusiness: boolean;
	businessCategory: string | null;
	businessHours: string | null;
	businessWebsite: string | null;
	businessDescription: string | null;
};

export const getContactForPanel = cache(
	async (contactId: string): Promise<ContactForPanel | null> => {
		const [row] = await db
			.select({
				id: contact.id,
				name: contact.name,
				phone: contact.phone,
				email: contact.email,
				company: contact.company,
				photoUrl: contact.photoUrl,
				isBusiness: contact.isBusiness,
				businessCategory: contact.businessCategory,
				businessHours: contact.businessHours,
				businessWebsite: contact.businessWebsite,
				businessDescription: contact.businessDescription,
			})
			.from(contact)
			.where(eq(contact.id, contactId))
			.limit(1);
		return row ?? null;
	},
);

export type DefaultPipelineForOrg = {
	pipelineId: string;
	firstStageId: string;
};

/**
 * Retorna o pipeline default da org + primeiro stage. Usado pelo botão "Criar Lead"
 * no painel direito do chat.
 */
export const getDefaultPipelineForOrg = cache(
	async (organizationId: string): Promise<DefaultPipelineForOrg | null> => {
		const [p] = await db
			.select({ id: pipeline.id })
			.from(pipeline)
			.where(eq(pipeline.organizationId, organizationId))
			.orderBy(desc(pipeline.isDefault), asc(pipeline.createdAt))
			.limit(1);
		if (!p) return null;

		const [firstStage] = await db
			.select({ id: pipelineStage.id })
			.from(pipelineStage)
			.where(eq(pipelineStage.pipelineId, p.id))
			.orderBy(asc(pipelineStage.position))
			.limit(1);
		if (!firstStage) return null;

		return { pipelineId: p.id, firstStageId: firstStage.id };
	},
);

/**
 * Retorna lead ativo do contato (não fechado). Usado no painel direito pra exibir dados do lead.
 */
export const getActiveLeadForContact = cache(
	async (
		contactId: string,
	): Promise<{
		id: string;
		title: string | null;
		pipelineId: string;
		stageId: string;
		stageName: string;
		stageColor: string;
		value: string | null;
		currency: string;
		temperature: string;
		priority: string;
		origin: string | null;
		assignedTo: string | null;
		email: string | null;
		company: string | null;
	} | null> => {
		const [row] = await db
			.select({
				id: lead.id,
				title: lead.title,
				pipelineId: lead.pipelineId,
				stageId: lead.stageId,
				stageName: pipelineStage.name,
				stageColor: pipelineStage.color,
				isClosing: pipelineStage.isClosing,
				value: lead.value,
				currency: lead.currency,
				temperature: lead.temperature,
				priority: lead.priority,
				origin: lead.origin,
				assignedTo: lead.assignedTo,
			})
			.from(lead)
			.innerJoin(pipelineStage, eq(lead.stageId, pipelineStage.id))
			.where(eq(lead.contactId, contactId))
			.orderBy(asc(pipelineStage.isClosing), desc(lead.updatedAt))
			.limit(1);

		if (!row) return null;

		// Pega email/empresa do contato
		const [c] = await db
			.select({ email: contact.email, company: contact.company })
			.from(contact)
			.where(eq(contact.id, contactId))
			.limit(1);

		return {
			id: row.id,
			title: row.title,
			pipelineId: row.pipelineId,
			stageId: row.stageId,
			stageName: row.stageName,
			stageColor: row.stageColor,
			value: row.value,
			currency: row.currency,
			temperature: row.temperature,
			priority: row.priority,
			origin: row.origin,
			assignedTo: row.assignedTo,
			email: c?.email ?? null,
			company: c?.company ?? null,
		};
	},
);
