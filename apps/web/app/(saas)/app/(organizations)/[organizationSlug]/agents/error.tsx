"use client";

import { Button } from "@ui/components/button";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import { useEffect } from "react";

/**
 * Error boundary pra rotas /agents/*.
 * Fix H2 do Smith verify (2026-04-21) — antes dessas rotas crashavam pra
 * tela branca em falhas de LLM schema, null pointers, etc.
 */
export default function AgentsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[agents/error]", error);
	}, [error]);

	return (
		<div className="flex min-h-[60vh] items-center justify-center p-6">
			<div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
					<AlertTriangleIcon className="size-6 text-destructive" />
				</div>
				<div>
					<h2 className="font-semibold text-foreground text-lg">
						Algo deu errado ao carregar os agentes
					</h2>
					<p className="mt-2 text-foreground/60 text-sm">
						Pode ter sido uma conexão lenta ou uma resposta inesperada
						do servidor. Tente novamente.
					</p>
					{error.digest ? (
						<p className="mt-3 text-foreground/40 text-xs">
							Ref: {error.digest}
						</p>
					) : null}
				</div>
				<div className="flex gap-2">
					<Button onClick={reset} className="gap-2">
						<RotateCcwIcon className="size-4" />
						Tentar de novo
					</Button>
				</div>
			</div>
		</div>
	);
}
