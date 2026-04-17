import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { MessageSquareIcon } from "lucide-react";

export default function CrmChatPage() {
	return (
		<>
			<PageHeader
				title="Chat"
				subtitle="Atendimento via WhatsApp unificado com os leads"
			/>
			<ComingSoon
				icon={MessageSquareIcon}
				title="Chat WhatsApp em breve"
				description="Você vai responder leads em uma caixa de entrada unificada, com IA integrada e handoff para humanos."
			/>
		</>
	);
}
