import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { PlusIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";

export default async function AgentsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;

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
			<ComingSoon
				icon={SparklesIcon}
				title="Seus agentes aparecerão aqui"
				description="Crie agentes comerciais que respondem no WhatsApp, executam ações no pipeline e agendam reuniões automaticamente."
			/>
		</>
	);
}
