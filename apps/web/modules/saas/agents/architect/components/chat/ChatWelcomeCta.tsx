"use client";

import { AiStudioIcon } from "@saas/shared/components/AiStudioIcon";
import { Button } from "@ui/components/button";
import { Loader2Icon } from "lucide-react";

type Props = {
	templateLabel: string;
	isStarting: boolean;
	onStart: () => void;
};

/**
 * Tela de entrada do chat do Arquiteto (story 09.5 UX refinement).
 *
 * Aparece centralizada antes do primeiro turno. Botão único dispara
 * criação da sessão + mensagem trigger oculta → Arquiteto responde com
 * apresentação + primeira pergunta. Composer fica oculto até o chat
 * realmente começar (menos ruído visual pra quem acabou de chegar).
 */
export function ChatWelcomeCta({
	templateLabel,
	isStarting,
	onStart,
}: Props) {
	return (
		<div className="flex flex-1 items-center justify-center bg-background px-6">
			<div className="flex max-w-md flex-col items-center text-center">
				<div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
					<AiStudioIcon className="size-8" />
				</div>
				<h2 className="mb-2 font-semibold text-2xl text-foreground tracking-tight">
					Vamos começar?
				</h2>
				<p className="mb-8 text-foreground/60 text-sm leading-relaxed">
					O Arquiteto vai te guiar na construção do seu agente de{" "}
					<span className="font-medium text-foreground/80">
						{templateLabel}
					</span>
					. Uma conversa natural, sem formulário.
				</p>
				<Button
					size="lg"
					onClick={onStart}
					disabled={isStarting}
					className="gap-2"
				>
					{isStarting ? (
						<>
							<Loader2Icon className="size-4 animate-spin" />
							Iniciando...
						</>
					) : (
						<>
							<AiStudioIcon className="size-4" />
							Iniciar construção do agente de IA
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
