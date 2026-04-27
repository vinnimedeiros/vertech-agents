import { Hero } from "@saas/agents/architect/components/welcome/Hero";
import { SessionHistory } from "@saas/agents/architect/components/welcome/SessionHistory";
import { TemplateGrid } from "@saas/agents/architect/components/welcome/TemplateGrid";
import { getDraftSessions } from "@saas/agents/architect/lib/server";
import { AgentsList } from "@saas/agents/components/AgentsList";
import { getAgentsByOrg } from "@saas/agents/lib/server";
import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { listInstancesForOrg } from "@saas/whatsapp/lib/server";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@ui/components/accordion";
import { Separator } from "@ui/components/separator";
import { notFound } from "next/navigation";

/**
 * Tela de boas-vindas do Arquiteto (story 09.1).
 *
 * Dois estados automaticos baseados em dados carregados:
 * - estado vazio (sem agentes + sem rascunhos): Hero dominante + grid de 7 templates
 * - estado com agentes: Hero comprimido + Rascunhos + Agentes publicados + Templates (accordion colapsado)
 */
export default async function AgentsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;

	const [activeOrganization, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);
	if (!activeOrganization) {
		notFound();
	}
	if (!session?.user) {
		notFound();
	}

	const [agents, instances, drafts] = await Promise.all([
		getAgentsByOrg(activeOrganization.id),
		listInstancesForOrg(activeOrganization.id),
		getDraftSessions(session.user.id, activeOrganization.id),
	]);

	const whatsappInstancesById = Object.fromEntries(
		instances.map((i) => [i.id, i.name]),
	) as Record<string, string>;

	const isEmpty = agents.length === 0 && drafts.length === 0;

	if (isEmpty) {
		return (
			<div className="flex flex-col gap-8">
				<Hero organizationSlug={organizationSlug} variant="empty" />
				<Separator />
				<div className="space-y-4">
					<h2 className="font-semibold text-foreground text-lg">
						Ou comece do zero com um template
					</h2>
					<TemplateGrid organizationSlug={organizationSlug} />
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<Hero organizationSlug={organizationSlug} variant="compressed" />

			<SessionHistory
				drafts={drafts}
				organizationSlug={organizationSlug}
			/>

			<Accordion type="single" collapsible defaultValue="agents">
				<AccordionItem value="agents" className="border-b-0">
					<AccordionTrigger className="font-semibold text-base hover:no-underline">
						<span className="flex items-center gap-2">
							Agentes publicados
							<span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
								{agents.length}
							</span>
						</span>
					</AccordionTrigger>
					<AccordionContent>
						{agents.length === 0 ? (
							<p className="pb-2 text-foreground/60 text-sm">
								Nenhum agente publicado ainda.
							</p>
						) : (
							<div className="pb-2">
								<AgentsList
									agents={agents}
									organizationSlug={organizationSlug}
									whatsappInstancesById={
										whatsappInstancesById
									}
								/>
							</div>
						)}
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<Accordion type="single" collapsible>
				<AccordionItem value="templates" className="border-b-0">
					<AccordionTrigger className="font-semibold text-base hover:no-underline">
						Começar do zero com um template
					</AccordionTrigger>
					<AccordionContent>
						<TemplateGrid
							organizationSlug={organizationSlug}
							className="pb-2 pt-2"
						/>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
