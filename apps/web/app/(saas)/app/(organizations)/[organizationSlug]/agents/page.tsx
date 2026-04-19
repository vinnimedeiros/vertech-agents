import { getAgentsByOrg } from "@saas/agents/lib/server";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { listInstancesForOrg } from "@saas/whatsapp/lib/server";
import { Button } from "@ui/components/button";
import { PlusIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentsList } from "@saas/agents/components/AgentsList";

export default async function AgentsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;

	const activeOrganization = await getActiveOrganization(organizationSlug);
	if (!activeOrganization) {
		notFound();
	}

	const [agents, instances] = await Promise.all([
		getAgentsByOrg(activeOrganization.id),
		listInstancesForOrg(activeOrganization.id),
	]);

	const whatsappInstancesById = Object.fromEntries(
		instances.map((i) => [i.id, i.name]),
	) as Record<string, string>;

	return (
		<>
			<PageHeader
				title="Agentes"
				subtitle="Agentes de IA que atendem seus leads no WhatsApp"
			>
				<Button asChild>
					<Link href={`/app/${organizationSlug}/agents/new`}>
						<PlusIcon className="mr-2 size-4" />
						Novo agente
					</Link>
				</Button>
			</PageHeader>

			{agents.length === 0 ? (
				<div className="flex flex-col items-center gap-4">
					<ComingSoon
						icon={SparklesIcon}
						title="Seus agentes aparecerão aqui"
						description="Crie seu primeiro agente comercial com o formulário rápido."
					/>
					<Button asChild>
						<Link href={`/app/${organizationSlug}/agents/new`}>
							<PlusIcon className="mr-2 size-4" />
							Criar agente
						</Link>
					</Button>
				</div>
			) : (
				<AgentsList
					agents={agents}
					organizationSlug={organizationSlug}
					whatsappInstancesById={whatsappInstancesById}
				/>
			)}
		</>
	);
}
