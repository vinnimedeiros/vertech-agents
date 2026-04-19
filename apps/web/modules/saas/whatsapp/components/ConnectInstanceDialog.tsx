"use client";

import { createInstanceAction } from "@saas/whatsapp/lib/actions";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { useState, useTransition } from "react";

type Props = {
	organizationId: string;
	organizationSlug: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (instanceId: string) => void;
};

export function ConnectInstanceDialog({
	organizationId,
	organizationSlug,
	open,
	onOpenChange,
	onCreated,
}: Props) {
	const [name, setName] = useState("Número principal");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function submit() {
		const trimmed = name.trim();
		if (!trimmed) {
			setError("Dê um nome pra essa conexão");
			return;
		}
		setError(null);
		startTransition(async () => {
			try {
				const { instanceId } = await createInstanceAction(
					{ organizationId, name: trimmed },
					organizationSlug,
				);
				onCreated(instanceId);
				onOpenChange(false);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Falha ao criar instância",
				);
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Nova conexão WhatsApp</DialogTitle>
					<DialogDescription>
						Dê um nome pra essa conexão (ex: &quot;Atendimento&quot;, &quot;Vendas&quot;).
						Você vai escanear o QR no próximo passo.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 py-2">
					<div className="space-y-1.5">
						<label
							htmlFor="wa-inst-name"
							className="text-xs font-medium text-foreground/80"
						>
							Nome da conexão
						</label>
						<Input
							id="wa-inst-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Número principal"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									submit();
								}
							}}
						/>
					</div>

					{error ? (
						<div className="rounded-md bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400">
							{error}
						</div>
					) : null}
				</div>

				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button onClick={submit} disabled={isPending}>
						{isPending ? "Criando…" : "Avançar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
