import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { PlugIcon } from "lucide-react";

export default function CrmIntegracoesPage() {
	return (
		<>
			<PageHeader
				title="Integrações"
				subtitle="Conecte WhatsApp, Google Calendar e outras ferramentas"
			/>
			<ComingSoon
				icon={PlugIcon}
				title="Integrações em breve"
				description="Conecte o WhatsApp da sua empresa, sincronize o Google Calendar e configure webhooks para ferramentas externas."
			/>
		</>
	);
}
