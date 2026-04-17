import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { UsersIcon } from "lucide-react";

export default function CrmLeadsPage() {
	return (
		<>
			<PageHeader
				title="Leads"
				subtitle="Lista e detalhe de todos os contatos em prospecção"
			/>
			<ComingSoon
				icon={UsersIcon}
				title="Leads em breve"
				description="Visualize todos os leads em uma tabela filtrável, com timeline de atividades e drawer de detalhes completo."
			/>
		</>
	);
}
