"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog";
import { Button } from "@ui/components/button";
import { Card, CardContent } from "@ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { CheckCircle2Icon, Loader2Icon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
	linkAgentToWhatsAppAction,
	unlinkAgentFromWhatsAppAction,
} from "../lib/actions";
import { useAgent } from "../lib/agent-context";
import type { AvailableInstance } from "../lib/whatsapp-server";

type Props = {
	organizationSlug: string;
	availableInstances: AvailableInstance[];
	currentInstance: AvailableInstance | null;
};

function formatPhone(raw: string | null): string {
	if (!raw) return "Sem número cadastrado";
	// Formato simples: +XX XX XXXXX-XXXX
	const digits = raw.replace(/\D/g, "");
	if (digits.length === 13) {
		return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
	}
	if (digits.length === 12) {
		return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`;
	}
	return raw;
}

export function WhatsAppTab({
	organizationSlug,
	availableInstances,
	currentInstance,
}: Props) {
	const agent = useAgent();
	const isArchived = agent.status === "ARCHIVED";
	const hasLink = !!currentInstance;

	const [selected, setSelected] = useState<string>(
		currentInstance?.id ?? "",
	);
	const [pending, startTransition] = useTransition();
	const [unlinkOpen, setUnlinkOpen] = useState(false);

	const selectableInstances = availableInstances.filter(
		(i) => i.id !== currentInstance?.id,
	);

	const canApply =
		!!selected && selected !== (currentInstance?.id ?? "") && !isArchived;

	const handleApply = () => {
		if (!selected) return;
		startTransition(async () => {
			try {
				await linkAgentToWhatsAppAction(
					{ agentId: agent.id, whatsappInstanceId: selected },
					organizationSlug,
				);
				toast.success(
					hasLink ? "Instância trocada." : "WhatsApp vinculado.",
				);
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível vincular.");
			}
		});
	};

	const handleUnlink = () => {
		setUnlinkOpen(false);
		startTransition(async () => {
			try {
				const result = (await unlinkAgentFromWhatsAppAction(
					{ agentId: agent.id },
					organizationSlug,
				)) as { pausedByUnlink: boolean };
				if (result.pausedByUnlink) {
					toast.success("WhatsApp desvinculado. Agente pausado.");
				} else {
					toast.success("WhatsApp desvinculado.");
				}
				setSelected("");
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível desvincular.");
			}
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h3 className="font-semibold text-foreground text-lg">WhatsApp</h3>
				<p className="mt-1 text-foreground/60 text-sm">
					Conecte o agente a uma instância de WhatsApp pra começar a
					responder mensagens.
				</p>
			</div>

			{hasLink ? (
				<Card>
					<CardContent className="flex flex-col gap-4 pt-6">
						<div className="flex items-start gap-3">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
								<CheckCircle2Icon className="size-5" />
							</div>
							<div className="flex-1">
								<p className="font-semibold text-foreground">
									Vinculado a: {currentInstance.name}
								</p>
								<p className="text-foreground/60 text-sm">
									{formatPhone(currentInstance.phoneNumber)}
								</p>
								<p className="mt-1 text-foreground/50 text-xs">
									Status: {currentInstance.status}
								</p>
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setUnlinkOpen(true)}
								disabled={pending || isArchived}
							>
								Desvincular
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
						<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
							<PhoneIcon className="size-6 text-primary" />
						</div>
						<div>
							<p className="font-semibold text-foreground">
								Este agente não está vinculado a nenhuma instância
							</p>
							<p className="mt-1 text-foreground/60 text-sm">
								Selecione uma instância pra começar a receber mensagens.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{selectableInstances.length > 0 ? (
				<div className="flex flex-col gap-2">
					<span className="font-medium text-sm">
						{hasLink
							? "Trocar pra outra instância"
							: "Escolher instância"}
					</span>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Select
							value={selected}
							onValueChange={setSelected}
							disabled={isArchived || pending}
						>
							<SelectTrigger className="sm:flex-1">
								<SelectValue placeholder="Selecione uma instância" />
							</SelectTrigger>
							<SelectContent>
								{selectableInstances.map((i) => (
									<SelectItem key={i.id} value={i.id}>
										{i.name}
										{i.phoneNumber ? ` · ${formatPhone(i.phoneNumber)}` : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							onClick={handleApply}
							disabled={!canApply || pending}
							size="sm"
						>
							{pending ? (
								<>
									<Loader2Icon className="mr-2 size-4 animate-spin" />
									Aplicando...
								</>
							) : hasLink ? (
								"Trocar"
							) : (
								"Vincular"
							)}
						</Button>
					</div>
				</div>
			) : (
				<p className="text-foreground/60 text-sm">
					Nenhuma instância disponível no momento. Conecte uma em{" "}
					<Link
						href={`/app/${organizationSlug}/crm/integracoes`}
						className="text-primary hover:underline"
					>
						Integrações
					</Link>
					.
				</p>
			)}

			<AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Desvincular WhatsApp?</AlertDialogTitle>
						<AlertDialogDescription>
							{agent.status === "ACTIVE"
								? "O agente será pausado, já que sem WhatsApp não pode operar. Você pode reativar depois de vincular outra instância."
								: "O agente continuará no mesmo status, mas sem receber mensagens até vincular outra instância."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={handleUnlink}>
							Desvincular
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
