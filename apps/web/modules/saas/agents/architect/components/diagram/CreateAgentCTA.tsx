"use client";

import { Button } from "@ui/components/button";
import { Loader2Icon, SparklesIcon } from "lucide-react";

type Props = {
	agentName: string;
	isPublishing: boolean;
	disabled?: boolean;
	onClick: () => void;
};

/**
 * Botão de criação final do agente (story 09.9).
 *
 * Aparece abaixo do FlowDiagramPreview no Resumo Final. Click dispara
 * transação atômica no server via `/api/architect/sessions/[id]/publish`.
 */
export function CreateAgentCTA({
	agentName,
	isPublishing,
	disabled,
	onClick,
}: Props) {
	return (
		<div className="mt-4 flex justify-center">
			<Button
				size="lg"
				onClick={onClick}
				disabled={isPublishing || disabled}
				className="gap-2"
			>
				{isPublishing ? (
					<>
						<Loader2Icon className="size-4 animate-spin" />
						Criando agente...
					</>
				) : (
					<>
						<SparklesIcon className="size-4" />
						Criar agente {agentName}
					</>
				)}
			</Button>
		</div>
	);
}
