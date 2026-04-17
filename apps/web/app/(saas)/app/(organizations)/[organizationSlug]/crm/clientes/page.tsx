import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { UserCheckIcon } from "lucide-react";

export default function CrmClientesPage() {
	return (
		<>
			<PageHeader
				title="Clientes"
				subtitle="Leads convertidos em clientes ativos"
			/>
			<ComingSoon
				icon={UserCheckIcon}
				title="Clientes em breve"
				description="Gestão dos clientes fechados, com histórico de compras, contatos e propostas vinculadas."
			/>
		</>
	);
}
