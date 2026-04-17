import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { FileTextIcon } from "lucide-react";

export default function CrmPropostasPage() {
	return (
		<>
			<PageHeader
				title="Propostas"
				subtitle="Orçamentos e propostas comerciais enviadas"
			/>
			<ComingSoon
				icon={FileTextIcon}
				title="Propostas em breve"
				description="Crie, envie e acompanhe o status de propostas comerciais diretamente pelo WhatsApp."
			/>
		</>
	);
}
