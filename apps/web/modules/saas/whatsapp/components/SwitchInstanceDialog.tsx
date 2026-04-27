"use client";

import { switchInstanceAction } from "@saas/whatsapp/lib/actions";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { TriangleAlertIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

type Props = {
	oldInstanceId: string;
	currentName: string;
	organizationSlug: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSwitched: (newInstanceId: string) => void;
};

const CONFIRM_DELAY_SECONDS = 5;

export function SwitchInstanceDialog({
	oldInstanceId,
	currentName,
	organizationSlug,
	open,
	onOpenChange,
	onSwitched,
}: Props) {
	const [name, setName] = useState(currentName);
	const [inheritContacts, setInheritContacts] = useState(true);
	const [inheritConversations, setInheritConversations] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [stage, setStage] = useState<"choose" | "confirm">("choose");
	const [secondsLeft, setSecondsLeft] = useState(CONFIRM_DELAY_SECONDS);
	const [isPending, startTransition] = useTransition();

	// Reset estado quando o dialog abre
	useEffect(() => {
		if (open) {
			setName(currentName);
			setInheritContacts(true);
			setInheritConversations(true);
			setError(null);
			setStage("choose");
			setSecondsLeft(CONFIRM_DELAY_SECONDS);
		}
	}, [open, currentName]);

	// Sem herdar contatos → não dá pra herdar conversas (FK cascade derruba).
	useEffect(() => {
		if (!inheritContacts && inheritConversations) {
			setInheritConversations(false);
		}
	}, [inheritContacts, inheritConversations]);

	// Timer de 5s no modal de confirmação destrutiva
	useEffect(() => {
		if (stage !== "confirm") return;
		setSecondsLeft(CONFIRM_DELAY_SECONDS);
		const interval = setInterval(() => {
			setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
		}, 1000);
		return () => clearInterval(interval);
	}, [stage]);

	const willDeleteEverything = !inheritContacts && !inheritConversations;

	const primaryLabel = (() => {
		if (willDeleteEverything) return "Deletar dados e trocar número";
		if (inheritContacts && inheritConversations) return "Trocar e herdar";
		if (inheritContacts) return "Trocar e herdar apenas contatos";
		return "Trocar e herdar apenas conversas";
	})();

	async function execute() {
		const trimmed = name.trim();
		if (!trimmed) {
			setError("Dê um nome pra nova conexão");
			return;
		}
		setError(null);
		startTransition(async () => {
			try {
				const { instanceId } = await switchInstanceAction(
					{
						oldInstanceId,
						newName: trimmed,
						inheritContacts,
						inheritConversations,
					},
					organizationSlug,
				);
				onSwitched(instanceId);
				onOpenChange(false);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Falha ao trocar número",
				);
			}
		});
	}

	function handlePrimary() {
		if (willDeleteEverything) {
			setStage("confirm");
			return;
		}
		execute();
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				{stage === "choose" ? (
					<>
						<DialogHeader>
							<DialogTitle>Trocar número</DialogTitle>
							<DialogDescription>
								Você vai escanear um QR novo. Escolha o que fazer com os
								dados do número atual.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-2">
							<div className="space-y-1.5">
								<label
									htmlFor="wa-switch-name"
									className="text-xs font-medium text-foreground/80"
								>
									Nome da nova conexão
								</label>
								<Input
									id="wa-switch-name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Número principal"
									autoFocus
								/>
							</div>

							<div className="space-y-2.5 rounded-md border border-border/60 bg-background/40 p-3">
								<label className="flex items-start gap-2.5 text-sm">
									<Checkbox
										checked={inheritContacts}
										onCheckedChange={(v) => setInheritContacts(v === true)}
										className="mt-0.5"
									/>
									<span>
										<span className="font-medium text-foreground">
											Herdar contatos
										</span>
										<span className="block text-xs text-foreground/55">
											Mantém todos os contatos criados via WhatsApp.
										</span>
									</span>
								</label>

								<label
									className={cn(
										"flex items-start gap-2.5 text-sm",
										!inheritContacts && "opacity-40",
									)}
								>
									<Checkbox
										checked={inheritConversations}
										onCheckedChange={(v) =>
											setInheritConversations(v === true)
										}
										disabled={!inheritContacts}
										className="mt-0.5"
									/>
									<span>
										<span className="font-medium text-foreground">
											Herdar conversas
										</span>
										<span className="block text-xs text-foreground/55">
											{!inheritContacts
												? "Indisponível sem herdar contatos."
												: "Reaponta o histórico de mensagens pro novo número."}
										</span>
									</span>
								</label>
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
							<Button
								onClick={handlePrimary}
								disabled={isPending}
								className={cn(
									willDeleteEverything &&
										"bg-rose-500 text-white hover:bg-rose-600",
								)}
							>
								{isPending ? "Trocando…" : primaryLabel}
							</Button>
						</DialogFooter>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2 text-rose-400">
								<TriangleAlertIcon className="size-5" />
								Confirmar exclusão
							</DialogTitle>
							<DialogDescription>
								Você vai apagar todos os contatos criados via WhatsApp (sem
								lead promovido), todas as conversas e mensagens. Essa ação
								é irreversível.
							</DialogDescription>
						</DialogHeader>

						<div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
							Pra evitar exclusão acidental, o botão libera em{" "}
							<span className="font-semibold">{secondsLeft}s</span>.
						</div>

						{error ? (
							<div className="rounded-md bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400">
								{error}
							</div>
						) : null}

						<DialogFooter>
							<Button
								variant="ghost"
								onClick={() => setStage("choose")}
								disabled={isPending}
							>
								Voltar
							</Button>
							<Button
								onClick={execute}
								disabled={isPending || secondsLeft > 0}
								className="bg-rose-500 text-white hover:bg-rose-600"
							>
								{isPending
									? "Apagando…"
									: secondsLeft > 0
										? `Apagar (${secondsLeft}s)`
										: "Apagar tudo e trocar"}
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
