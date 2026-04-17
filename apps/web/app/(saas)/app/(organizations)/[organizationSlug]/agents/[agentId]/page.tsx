import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { BotIcon } from "lucide-react";

export default async function AgentDetailPage({
	params,
}: {
	params: Promise<{ agentId: string }>;
}) {
	const { agentId } = await params;

	return (
		<>
			<PageHeader
				title="Detalhes do agente"
				subtitle={`ID: ${agentId}`}
			/>
			<ComingSoon
				icon={BotIcon}
				title="Tela de detalhe em breve"
				description="Aqui você vai ver métricas, conversas, configuração, base de conhecimento e histórico de versões do agente."
			/>
		</>
	);
}
