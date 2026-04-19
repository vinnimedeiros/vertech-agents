import { getActiveOrganization } from "@saas/auth/lib/server";
import {
	ContactDetailsPanel,
	type DetailsLead,
	type StageOption,
} from "@saas/chat/components/ContactDetailsPanel";
import { ContactDetailsSlot } from "@saas/chat/components/ContactDetailsSlot";
import { ConversationMessagesProvider } from "@saas/chat/components/ConversationMessagesContext";
import { ThreadPanel } from "@saas/chat/components/ThreadPanel";
import {
	getActiveLeadForContact,
	getContactForPanel,
	getConversationDetail,
	getDefaultPipelineForOrg,
	listMessages,
} from "@saas/chat/lib/server";
import {
	getPipelineWithStages,
	listOrgMembers,
} from "@saas/crm/lib/server";
import { refreshContactWhatsAppProfileAction } from "@saas/whatsapp/lib/enrich-action";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConversationThreadPage({
	params,
}: {
	params: Promise<{ organizationSlug: string; conversationId: string }>;
}) {
	const { organizationSlug, conversationId } = await params;
	const org = await getActiveOrganization(organizationSlug);
	if (!org) {
		console.error("[chat/[conversationId]] org not found", {
			organizationSlug,
			conversationId,
		});
		return notFound();
	}

	const conversation = await getConversationDetail(conversationId);
	if (!conversation) {
		console.error("[chat/[conversationId]] conversation not found", {
			organizationSlug,
			conversationId,
			orgId: org.id,
		});
		return notFound();
	}
	if (conversation.organizationId !== org.id) {
		console.error("[chat/[conversationId]] org mismatch", {
			conversationId,
			orgIdFromAuth: org.id,
			orgIdOnConversation: conversation.organizationId,
		});
		return notFound();
	}

	const [messages, contact, leadRaw, members, defaults] = await Promise.all([
		listMessages(conversationId, { limit: 80 }),
		getContactForPanel(conversation.contactId),
		getActiveLeadForContact(conversation.contactId),
		listOrgMembers(org.id),
		getDefaultPipelineForOrg(org.id),
	]);

	if (!contact) {
		console.error("[chat/[conversationId]] contact not found", {
			contactId: conversation.contactId,
		});
		return notFound();
	}

	// Se for WhatsApp e o contato ainda não tem foto, dispara enrichment em
	// background (usa o sock da instância ativa pra puxar foto + business info).
	// Fire-and-forget: não bloqueia o render.
	if (
		conversation.channel === "WHATSAPP" &&
		conversation.channelInstanceId &&
		!contact.photoUrl
	) {
		void refreshContactWhatsAppProfileAction(
			contact.id,
			conversation.channelInstanceId,
		).catch(() => {});
	}

	const lead: DetailsLead | null = leadRaw
		? {
				id: leadRaw.id,
				title: leadRaw.title,
				pipelineId: leadRaw.pipelineId,
				stageId: leadRaw.stageId,
				stageName: leadRaw.stageName,
				stageColor: leadRaw.stageColor,
				value: leadRaw.value,
				currency: leadRaw.currency,
				temperature: leadRaw.temperature as DetailsLead["temperature"],
				priority: leadRaw.priority as DetailsLead["priority"],
				origin: leadRaw.origin,
				assignedTo: leadRaw.assignedTo,
			}
		: null;

	const stages: StageOption[] = lead
		? (await getPipelineWithStages(lead.pipelineId))?.stages.map((s) => ({
				id: s.id,
				name: s.name,
				color: s.color,
			})) ?? []
		: [];

	return (
		<ConversationMessagesProvider
			conversationId={conversationId}
			initialMessages={messages}
		>
			<ThreadPanel conversation={conversation} />
			<ContactDetailsSlot>
				<ContactDetailsPanel
					conversation={conversation}
					contact={contact}
					lead={lead}
					stages={stages}
					members={members}
					organizationId={org.id}
					organizationSlug={organizationSlug}
					defaults={defaults}
				/>
			</ContactDetailsSlot>
		</ConversationMessagesProvider>
	);
}
