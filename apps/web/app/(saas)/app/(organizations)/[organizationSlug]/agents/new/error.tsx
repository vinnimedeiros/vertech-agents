"use client";

import { Button } from "@ui/components/button";
import { AlertTriangleIcon, ArrowLeftIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary pra wizard de criação de agente.
 * Fix H2 do Smith verify (2026-04-21) — falhas do LLM (schema mismatch,
 * rate limit, timeout) deixavam tela branca sem feedback.
 */
export default function NewAgentError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[agents/new/error]", error);
	}, [error]);

	return (
		<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
			<div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
					<AlertTriangleIcon className="size-6 text-destructive" />
				</div>
				<div>
					<h2 className="font-semibold text-foreground text-lg">
						Algo deu errado no Arquiteto
					</h2>
					<p className="mt-2 text-foreground/60 text-sm">
						A IA pode ter demorado pra responder ou houve uma falha na
						análise. Seu rascunho está salvo. Tente novamente ou volte
						para a lista.
					</p>
					{error.digest ? (
						<p className="mt-3 text-foreground/40 text-xs">
							Ref: {error.digest}
						</p>
					) : null}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" asChild>
						<Link href="../">
							<ArrowLeftIcon className="mr-2 size-4" />
							Voltar
						</Link>
					</Button>
					<Button onClick={reset} className="gap-2">
						<RotateCcwIcon className="size-4" />
						Tentar de novo
					</Button>
				</div>
			</div>
		</div>
	);
}
