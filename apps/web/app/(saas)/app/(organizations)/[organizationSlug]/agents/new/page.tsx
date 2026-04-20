import { ChatShell } from "@saas/agents/architect/components/chat/ChatShell";
import { getArchitectSessionForUser } from "@saas/agents/architect/lib/server";
import {
	type ArchitectTemplate,
	findArchitectTemplate,
} from "@saas/agents/architect/lib/templates";
import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { notFound, redirect } from "next/navigation";

type SearchParams = {
	template?: string;
	session?: string;
};

/**
 * Rota do chat do Arquiteto (story 09.2).
 *
 * Guards (AC1-3):
 * - Sem ?template e sem ?session → redirect pra /agents (tela de boas-vindas)
 * - ?template=X invalido → 404
 * - ?session=X que nao pertence ao user/org → 404
 *
 * Em caso de `?session`, o templateId vem da propria sessao carregada (ignora
 * ?template se vier junto). Em caso de `?template`, session e undefined (novo).
 *
 * Server component resolve template + session + auth antes de montar o ChatShell.
 *
 * Substitui o NewAgentForm (07B v1) — que foi deprecado pelo roadmap v2. Se
 * 07B v1 for mantido via cherry-pick do PR #1, esta mudanca precisa de merge
 * conflict resolution (esperado).
 */
export default async function NewArchitectChatPage({
	params,
	searchParams,
}: {
	params: Promise<{ organizationSlug: string }>;
	searchParams: Promise<SearchParams>;
}) {
	const { organizationSlug } = await params;
	const { template: templateParam, session: sessionParam } =
		await searchParams;

	const [activeOrganization, authSession] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);
	if (!activeOrganization) {
		notFound();
	}
	if (!authSession?.user) {
		notFound();
	}

	// AC1: sem query params -> volta pra tela de boas-vindas
	if (!templateParam && !sessionParam) {
		redirect(`/app/${organizationSlug}/agents`);
	}

	let resolvedTemplate: ArchitectTemplate | undefined;
	let resolvedSessionId: string | undefined;

	if (sessionParam) {
		// AC3: session deve pertencer ao user + org
		const row = await getArchitectSessionForUser(
			sessionParam,
			authSession.user.id,
			activeOrganization.id,
		);
		if (!row || row.status !== "DRAFT") {
			notFound();
		}
		resolvedSessionId = row.id;
		resolvedTemplate = findArchitectTemplate(row.templateId);
	} else if (templateParam) {
		resolvedTemplate = findArchitectTemplate(templateParam);
	}

	// AC2: template invalido -> 404
	if (!resolvedTemplate) {
		notFound();
	}

	return (
		<ChatShell
			organizationSlug={organizationSlug}
			templateId={resolvedTemplate.id}
			templateLabel={resolvedTemplate.label}
			sessionId={resolvedSessionId}
		/>
	);
}
