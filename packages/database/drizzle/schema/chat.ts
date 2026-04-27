import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	json,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { agent } from "./agents";
import { contact } from "./crm";
import { organization, user } from "./postgres";

// ============================================================
// Enums
// ============================================================

export const channelEnum = pgEnum("Channel", [
	"WHATSAPP",
	"EMAIL",
	"SMS",
	"WEBCHAT",
	"INTERNAL",
]);

export const conversationStatusEnum = pgEnum("ConversationStatus", [
	"NEW",
	"ACTIVE",
	"WAITING",
	"RESOLVED",
	"ARCHIVED",
]);

export const senderTypeEnum = pgEnum("SenderType", [
	"CONTACT",
	"USER",
	"AGENT",
	"SYSTEM",
]);

export const messageTypeEnum = pgEnum("MessageType", [
	"TEXT",
	"IMAGE",
	"AUDIO",
	"VIDEO",
	"DOCUMENT",
	"STICKER",
	"LOCATION",
	"CONTACT",
	"TEMPLATE",
	"SYSTEM",
]);

export const messageDirectionEnum = pgEnum("MessageDirection", [
	"INBOUND",
	"OUTBOUND",
]);

// Phase 07A: QUEUED e PROCESSING adicionados pra visibilidade do fluxo BullMQ.
// PENDING = criada mas sem decisao (ex: outbound draft humano)
// QUEUED = enfileirada no BullMQ aguardando worker (inbound com IA habilitada)
// PROCESSING = worker puxou, agente Mastra esta gerando resposta
// SENT / DELIVERED / READ = pos-envio WhatsApp
// FAILED = erro permanente (ja exauriu retry)
export const messageStatusEnum = pgEnum("MessageStatus", [
	"PENDING",
	"QUEUED",
	"PROCESSING",
	"SENT",
	"DELIVERED",
	"READ",
	"FAILED",
]);

// ============================================================
// Conversation
// ============================================================

export const conversation = pgTable(
	"conversation",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		contactId: varchar("contactId", { length: 255 })
			.notNull()
			.references(() => contact.id, { onDelete: "cascade" }),

		channel: channelEnum("channel").notNull().default("INTERNAL"),
		channelInstanceId: text("channelInstanceId"),
		status: conversationStatusEnum("status").notNull().default("NEW"),

		// IA — Phase 07A: FK real com agent.id (antes era text solto)
		assignedAgentId: text("assignedAgentId").references(() => agent.id, {
			onDelete: "set null",
		}),
		isAIEnabled: boolean("isAIEnabled").notNull().default(false),
		assignedUserId: text("assignedUserId").references(() => user.id, {
			onDelete: "set null",
		}),

		// Metadata pra lista
		lastMessageAt: timestamp("lastMessageAt"),
		lastMessagePreview: text("lastMessagePreview"),
		// Direção e status da ÚLTIMA mensagem — usado pela UI pra renderizar
		// checks (✓ enviado / ✓✓ entregue / ✓✓ azul lido) no preview da lista
		// quando a última mensagem foi OUTBOUND. Atualizados junto com preview.
		lastMessageDirection: messageDirectionEnum("lastMessageDirection"),
		lastMessageStatus: messageStatusEnum("lastMessageStatus"),
		unreadCount: integer("unreadCount").notNull().default(0),
		// Fixada no topo (ordenada por este timestamp DESC). Limite de 3 por org
		// validado a nível de action. Null = não fixada.
		pinnedAt: timestamp("pinnedAt"),

		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("conversation_org_status_idx").on(
			table.organizationId,
			table.status,
		),
		index("conversation_contact_idx").on(table.contactId),
		index("conversation_last_message_idx").on(table.lastMessageAt),
		// Uma conversa por par (contato, canal). Se a instância de WhatsApp for
		// trocada (reconexão com número novo/mesmo número), a conversa existente
		// é reusada e tem `channelInstanceId` atualizado no handler inbound.
		uniqueIndex("conversation_contact_channel_uniq").on(
			table.contactId,
			table.channel,
		),
	],
);

export const conversationRelations = relations(
	conversation,
	({ one, many }) => ({
		organization: one(organization, {
			fields: [conversation.organizationId],
			references: [organization.id],
		}),
		contact: one(contact, {
			fields: [conversation.contactId],
			references: [contact.id],
		}),
		assignee: one(user, {
			fields: [conversation.assignedUserId],
			references: [user.id],
		}),
		// Phase 07A: relation com agent quando IA habilitada
		assignedAgent: one(agent, {
			fields: [conversation.assignedAgentId],
			references: [agent.id],
		}),
		messages: many(message),
	}),
);

// ============================================================
// Message
// ============================================================

export const message = pgTable(
	"message",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		conversationId: varchar("conversationId", { length: 255 })
			.notNull()
			.references(() => conversation.id, { onDelete: "cascade" }),

		// Identificador externo (WhatsApp etc)
		externalId: text("externalId").unique(),
		externalTimestamp: timestamp("externalTimestamp"),

		// Autoria
		senderType: senderTypeEnum("senderType").notNull(),
		senderId: text("senderId"),
		senderName: text("senderName"),
		senderAvatar: text("senderAvatar"),

		direction: messageDirectionEnum("direction").notNull(),
		type: messageTypeEnum("type").notNull().default("TEXT"),
		status: messageStatusEnum("status").notNull().default("PENDING"),

		// Conteúdo
		text: text("text"),
		mediaUrl: text("mediaUrl"),
		mediaMimeType: text("mediaMimeType"),
		mediaFileName: text("mediaFileName"),
		mediaSize: integer("mediaSize"),
		durationSeconds: integer("durationSeconds"),
		caption: text("caption"),

		// Extras
		replyToMessageId: varchar("replyToMessageId", { length: 255 }),
		metadata: json("metadata").$type<Record<string, unknown>>(),

		createdAt: timestamp("createdAt").notNull().defaultNow(),
	},
	(table) => [
		index("message_conversation_created_idx").on(
			table.conversationId,
			table.createdAt,
		),
		index("message_external_idx").on(table.externalId),
	],
);

export const messageRelations = relations(message, ({ one }) => ({
	conversation: one(conversation, {
		fields: [message.conversationId],
		references: [conversation.id],
	}),
}));
