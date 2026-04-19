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
	inArray,
	isNotNull,
	lead,
	or,
	pipelineStage,
} from "@repo/database";
import { cache } from "react";

export type WhatsAppContactRow = {
	id: string;
	name: string;
	phone: string | null;
	photoUrl: string | null;
	isBusiness: boolean;
	businessCategory: string | null;
	source: string | null;
	tags: string[];
	lastSyncedAt: Date | null;
	promotedToLeadAt: Date | null;
	// Status derivado
	hasActiveLead: boolean;
	hasConversation: boolean;
	conversationId: string | null;
	lastStageName: string | null;
	lastStageColor: string | null;
	lastMessageAt: Date | null;
};

export type WhatsAppContactStatus =
	| "ALL"
	| "NEVER_TALKED"
	| "IN_CONVERSATION"
	| "IS_LEAD"
	| "ARCHIVED";

/**
 * Lista contatos da org com enriquecimento: presença de lead ativo e conversa
 * existente. Usado na página Contatos WhatsApp.
 */
export const listWhatsAppContactsForOrg = cache(
	async (
		organizationId: string,
		options?: {
			search?: string | null;
			status?: WhatsAppContactStatus;
		},
	): Promise<WhatsAppContactRow[]> => {
		const q = options?.search?.trim();
		// Somente contatos que vieram do WhatsApp (inbound ou sincronizados da
		// agenda). Contatos criados manualmente no CRM ficam só na aba
		// Clientes.
		const whereClauses = [
			eq(contact.organizationId, organizationId),
			inArray(contact.source, ["whatsapp", "whatsapp-contacts"]),
		];
		if (q && q.length > 0) {
			const term = `%${q}%`;
			whereClauses.push(
				or(
					ilike(contact.name, term),
					ilike(contact.phone, term),
					ilike(contact.email, term),
					ilike(contact.company, term),
				) as any,
			);
		}

		// 1) Contatos
		const contacts = await db
			.select({
				id: contact.id,
				name: contact.name,
				phone: contact.phone,
				photoUrl: contact.photoUrl,
				isBusiness: contact.isBusiness,
				businessCategory: contact.businessCategory,
				source: contact.source,
				tags: contact.tags,
				lastSyncedAt: contact.lastSyncedAt,
				promotedToLeadAt: contact.promotedToLeadAt,
			})
			.from(contact)
			.where(and(...whereClauses))
			.orderBy(desc(contact.lastSyncedAt), asc(contact.name));

		if (contacts.length === 0) return [];
		const ids = contacts.map((c) => c.id);

		// 2) Leads ativos (mais recente por contato)
		const leadRows = await db
			.select({
				contactId: lead.contactId,
				leadId: lead.id,
				updatedAt: lead.updatedAt,
				stageId: lead.stageId,
				stageName: pipelineStage.name,
				stageColor: pipelineStage.color,
				isClosing: pipelineStage.isClosing,
			})
			.from(lead)
			.innerJoin(pipelineStage, eq(lead.stageId, pipelineStage.id))
			.where(
				and(
					eq(lead.organizationId, organizationId),
					inArray(lead.contactId, ids),
				),
			)
			.orderBy(desc(lead.updatedAt));

		const latestLeadByContact = new Map<
			string,
			{ stageName: string | null; stageColor: string | null; active: boolean }
		>();
		for (const l of leadRows) {
			if (latestLeadByContact.has(l.contactId)) continue;
			latestLeadByContact.set(l.contactId, {
				stageName: l.stageName,
				stageColor: l.stageColor,
				active: !l.isClosing,
			});
		}

		// 3) Conversas (última por contato, canal WHATSAPP)
		const convRows = await db
			.select({
				contactId: conversation.contactId,
				conversationId: conversation.id,
				lastMessageAt: conversation.lastMessageAt,
			})
			.from(conversation)
			.where(
				and(
					eq(conversation.channel, "WHATSAPP"),
					inArray(conversation.contactId, ids),
				),
			)
			.orderBy(desc(conversation.lastMessageAt));

		const convByContact = new Map<
			string,
			{ conversationId: string; lastMessageAt: Date | null }
		>();
		for (const c of convRows) {
			if (convByContact.has(c.contactId)) continue;
			convByContact.set(c.contactId, {
				conversationId: c.conversationId,
				lastMessageAt: c.lastMessageAt,
			});
		}

		const enriched: WhatsAppContactRow[] = contacts.map((c) => {
			const leadInfo = latestLeadByContact.get(c.id);
			const convInfo = convByContact.get(c.id);
			return {
				id: c.id,
				name: c.name,
				phone: c.phone,
				photoUrl: c.photoUrl,
				isBusiness: c.isBusiness,
				businessCategory: c.businessCategory,
				source: c.source,
				tags: c.tags,
				lastSyncedAt: c.lastSyncedAt,
				promotedToLeadAt: c.promotedToLeadAt,
				hasActiveLead: !!leadInfo?.active,
				hasConversation: !!convInfo,
				conversationId: convInfo?.conversationId ?? null,
				lastStageName: leadInfo?.stageName ?? null,
				lastStageColor: leadInfo?.stageColor ?? null,
				lastMessageAt: convInfo?.lastMessageAt ?? null,
			};
		});

		const status = options?.status ?? "ALL";
		if (status === "NEVER_TALKED")
			return enriched.filter((r) => !r.hasConversation && !r.hasActiveLead);
		if (status === "IN_CONVERSATION")
			return enriched.filter((r) => r.hasConversation && !r.hasActiveLead);
		if (status === "IS_LEAD")
			return enriched.filter((r) => r.hasActiveLead);
		return enriched;
	},
);

export type WhatsAppContactStats = {
	total: number;
	neverTalked: number;
	inConversation: number;
	isLead: number;
};

export const getWhatsAppContactStats = cache(
	async (organizationId: string): Promise<WhatsAppContactStats> => {
		const rows = await listWhatsAppContactsForOrg(organizationId);
		let neverTalked = 0;
		let inConversation = 0;
		let isLead = 0;
		for (const r of rows) {
			if (r.hasActiveLead) isLead++;
			else if (r.hasConversation) inConversation++;
			else neverTalked++;
		}
		return {
			total: rows.length,
			neverTalked,
			inConversation,
			isLead,
		};
	},
);

/**
 * Lookup rápido (só nome/phone/photo) pros autocompletes — painel "+"
 * do chat, search de promote-to-lead, etc.
 */
export const searchContactsForPicker = cache(
	async (
		organizationId: string,
		search: string,
		limit = 2000,
	): Promise<
		Array<{
			id: string;
			name: string;
			phone: string | null;
			photoUrl: string | null;
			isBusiness: boolean;
		}>
	> => {
		const term = search.trim();
		const whereClauses = [
			eq(contact.organizationId, organizationId),
			isNotNull(contact.phone),
		];
		if (term.length > 0) {
			const q = `%${term}%`;
			whereClauses.push(
				or(
					ilike(contact.name, q),
					ilike(contact.phone, q),
				) as any,
			);
		}
		return db
			.select({
				id: contact.id,
				name: contact.name,
				phone: contact.phone,
				photoUrl: contact.photoUrl,
				isBusiness: contact.isBusiness,
			})
			.from(contact)
			.where(and(...whereClauses))
			.orderBy(asc(contact.name))
			.limit(limit);
	},
);
