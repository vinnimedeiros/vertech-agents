import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { CalendarIcon } from "lucide-react";

export default function CrmAgendaPage() {
	return (
		<>
			<PageHeader
				title="Agenda"
				subtitle="Eventos, reuniões e sincronização com o Google Calendar"
			/>
			<ComingSoon
				icon={CalendarIcon}
				title="Agenda em breve"
				description="Sincronização bidirecional com o Google Calendar e criação automática de reuniões pelo agente de IA."
			/>
		</>
	);
}
