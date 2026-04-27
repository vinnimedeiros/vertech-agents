import { getActiveOrganization } from "@saas/auth/lib/server";
import { DraftThreadPanel } from "@saas/chat/components/DraftThreadPanel";
import { findExistingConversationWithContactAction } from "@saas/whatsapp-contacts/lib/actions";
import { contact, db, eq } from "@repo/database";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChatDraftPage({
	params,
}: {
	params: Promise<{ organizationSlug: string; contactId: string }>;
}) {
	const { organizationSlug, contactId } = await params;
	const org = await getActiveOrganization(organizationSlug);
	if (!org) return notFound();

	const [row] = await db
		.select({
			id: contact.id,
			name: contact.name,
			phone: contact.phone,
			photoUrl: contact.photoUrl,
			organizationId: contact.organizationId,
		})
		.from(contact)
		.where(eq(contact.id, contactId))
		.limit(1);

	if (!row || row.organizationId !== org.id) return notFound();

	// Se já existe conversa com este contato, redireciona pra ela
	const { conversationId } =
		await findExistingConversationWithContactAction(contactId);
	if (conversationId) {
		redirect(`/app/${organizationSlug}/crm/chat/${conversationId}`);
	}

	return (
		<DraftThreadPanel
			organizationSlug={organizationSlug}
			contact={{
				id: row.id,
				name: row.name,
				phone: row.phone,
				photoUrl: row.photoUrl,
			}}
		/>
	);
}
