import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { KanbanSquareIcon } from "lucide-react";

export default function CrmPipelinePage() {
	return (
		<>
			<PageHeader
				title="Pipeline"
				subtitle="Kanban de vendas com estágios customizáveis"
			/>
			<ComingSoon
				icon={KanbanSquareIcon}
				title="Pipeline em breve"
				description="Arraste leads entre estágios, acompanhe o funil de conversão e veja métricas financeiras em tempo real."
			/>
		</>
	);
}
