import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { ChatShell } from "@saas/chat/components/ChatShell";
import { NoWhatsAppConnectedState } from "@saas/chat/components/NoWhatsAppConnectedState";
import { listConversationsForOrg } from "@saas/chat/lib/server";
import { hasActiveWhatsAppInstance } from "@saas/whatsapp/lib/server";
import { notFound } from "next/navigation";
import type { PropsWithChildren } from "react";

/**
 * Ergue o BaileysManager quando o usuário entra no chat. Import dinâmico
 * pra que o custo de carregar o Baileys aconteça só aqui (e não no layout
 * raiz da organização), evitando quebrar outras páginas.
 * Idempotente: se já bootou, não faz nada.
 */
async function ensureBaileysBooted(): Promise<void> {
	if ((globalThis as Record<string, unknown>).__vertechWhatsAppBooted) return;
	(globalThis as Record<string, unknown>).__vertechWhatsAppBooted = true;
	try {
		const mod = await import("@repo/whatsapp");
		await mod.baileysManager.bootAll();
	} catch (err) {
		console.error("[chat layout] bootAll falhou", err);
		// reset flag pra tentar de novo na próxima request
		(globalThis as Record<string, unknown>).__vertechWhatsAppBooted = false;
	}
}

export default async function ChatLayout({
	children,
	params,
}: PropsWithChildren<{ params: Promise<{ organizationSlug: string }> }>) {
	const { organizationSlug } = await params;

	const [org, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);
	if (!org) return notFound();
	if (!session?.user) return notFound();

	// Boot do Baileys em paralelo com o load da lista; não bloqueia a UI.
	void ensureBaileysBooted();

	const hasInstance = await hasActiveWhatsAppInstance(org.id);

	// Sem nenhum número conectado: mostra CTA pra ir em integrações, em vez do
	// chat com conversas fantasma.
	if (!hasInstance) {
		return <NoWhatsAppConnectedState organizationSlug={organizationSlug} />;
	}

	const conversations = await listConversationsForOrg(org.id);

	return (
		<ChatShell
			organizationId={org.id}
			organizationSlug={organizationSlug}
			initialConversations={conversations}
		>
			{children}
		</ChatShell>
	);
}
