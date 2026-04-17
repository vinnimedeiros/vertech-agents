import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { WandSparklesIcon } from "lucide-react";

export default function NewAgentPage() {
	return (
		<>
			<PageHeader
				title="Novo agente"
				subtitle="Construa seu agente conversando com o Arquiteto"
			/>
			<ComingSoon
				icon={WandSparklesIcon}
				title="O Arquiteto em breve"
				description="Converse com o Arquiteto para construir agentes comerciais por descrição, sem formulários. Ele pergunta, sugere e publica seu agente pronto para operar."
			/>
		</>
	);
}
