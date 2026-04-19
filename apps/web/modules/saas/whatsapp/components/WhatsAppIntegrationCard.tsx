"use client";

import { ConnectInstanceDialog } from "@saas/whatsapp/components/ConnectInstanceDialog";
import { QRCodeDialog } from "@saas/whatsapp/components/QRCodeDialog";
import {
	deleteInstanceAction,
	disconnectInstanceAction,
	restartInstanceAction,
} from "@saas/whatsapp/lib/actions";
import type { WhatsAppInstanceRow } from "@saas/whatsapp/lib/server";
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
import { cn } from "@ui/lib";
import {
	CheckCircle2Icon,
	CircleDashedIcon,
	LinkIcon,
	Loader2Icon,
	MessageCircleIcon,
	PlusIcon,
	PowerOffIcon,
	RefreshCwIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
	organizationId: string;
	organizationSlug: string;
	instances: WhatsAppInstanceRow[];
};

const STATUS_META: Record<
	WhatsAppInstanceRow["status"],
	{ label: string; color: string; icon: typeof CheckCircle2Icon }
> = {
	PENDING: {
		label: "Aguardando",
		color: "text-foreground/50",
		icon: CircleDashedIcon,
	},
	CONNECTING: {
		label: "Conectando",
		color: "text-amber-400",
		icon: Loader2Icon,
	},
	CONNECTED: {
		label: "Conectado",
		color: "text-emerald-400",
		icon: CheckCircle2Icon,
	},
	DISCONNECTED: {
		label: "Desconectado",
		color: "text-rose-400",
		icon: TriangleAlertIcon,
	},
	LOGGED_OUT: {
		label: "Deslogado",
		color: "text-foreground/50",
		icon: CircleDashedIcon,
	},
	ERROR: {
		label: "Erro",
		color: "text-rose-500",
		icon: TriangleAlertIcon,
	},
};

export function WhatsAppIntegrationCard({
	organizationId,
	organizationSlug,
	instances,
}: Props) {
	const [connectOpen, setConnectOpen] = useState(false);
	const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [actionPending, startAction] = useTransition();
	const router = useRouter();

	function openQRFor(id: string) {
		setQrInstanceId(id);
	}

	function doRestart(id: string) {
		startAction(async () => {
			await restartInstanceAction({ instanceId: id }, organizationSlug);
			openQRFor(id);
			router.refresh();
		});
	}

	function doDisconnect(id: string) {
		startAction(async () => {
			await disconnectInstanceAction({ instanceId: id }, organizationSlug);
			router.refresh();
		});
	}

	function doDelete(id: string) {
		startAction(async () => {
			await deleteInstanceAction({ instanceId: id }, organizationSlug);
			setConfirmDeleteId(null);
			router.refresh();
		});
	}

	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card/30 p-5">
			<header className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<div className="flex size-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
						<MessageCircleIcon className="size-5" />
					</div>
					<div>
						<h3 className="font-semibold text-sm text-foreground">
							WhatsApp
						</h3>
						<p className="text-xs text-foreground/55">
							Conecte um ou mais números pra receber e responder dentro do
							Chat.
						</p>
					</div>
				</div>
				<Button
					size="sm"
					onClick={() => setConnectOpen(true)}
					className="gap-1.5"
				>
					<PlusIcon className="size-3.5" />
					Conectar número
				</Button>
			</header>

			{instances.length === 0 ? (
				<div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border/50 bg-background/30 px-4 py-8 text-center">
					<LinkIcon className="size-5 text-foreground/40" />
					<p className="text-xs text-foreground/55">
						Nenhum número conectado ainda.
					</p>
				</div>
			) : (
				<ul className="flex flex-col divide-y divide-border/50">
					{instances.map((inst) => {
						const meta = STATUS_META[inst.status];
						const Icon = meta.icon;
						const spinning = inst.status === "CONNECTING";
						const needsQR =
							inst.status === "PENDING" ||
							inst.status === "CONNECTING" ||
							inst.status === "LOGGED_OUT";

						return (
							<li
								key={inst.id}
								className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
							>
								<div className="flex min-w-0 items-center gap-3">
									<span
										className={cn(
											"flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/5",
											meta.color,
										)}
									>
										<Icon
											className={cn(
												"size-4",
												spinning && "animate-spin",
											)}
										/>
									</span>
									<div className="min-w-0">
										<div className="truncate text-sm font-medium text-foreground">
											{inst.name}
										</div>
										<div className="flex items-center gap-2 text-[11px]">
											<span className={meta.color}>{meta.label}</span>
											{inst.phoneNumber ? (
												<>
													<span className="text-foreground/30">·</span>
													<span className="text-foreground/55">
														+{inst.phoneNumber}
													</span>
												</>
											) : null}
										</div>
									</div>
								</div>

								<div className="flex shrink-0 items-center gap-1">
									{needsQR ? (
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												// LOGGED_OUT precisa restart (auth foi apagado);
												// PENDING/CONNECTING só abre o popup pra ver o QR.
												if (inst.status === "LOGGED_OUT") {
													doRestart(inst.id);
												} else {
													openQRFor(inst.id);
												}
											}}
											disabled={actionPending}
											className="gap-1.5"
										>
											<MessageCircleIcon className="size-3.5" />
											{inst.status === "LOGGED_OUT"
												? "Reconectar"
												: "Ver QR"}
										</Button>
									) : inst.status === "CONNECTED" ? (
										<Button
											size="sm"
											variant="ghost"
											onClick={() => doDisconnect(inst.id)}
											disabled={actionPending}
											className="gap-1.5 text-foreground/70"
											title="Desconectar"
										>
											<PowerOffIcon className="size-3.5" />
										</Button>
									) : (
										<Button
											size="sm"
											variant="outline"
											onClick={() => doRestart(inst.id)}
											disabled={actionPending}
											className="gap-1.5"
										>
											<RefreshCwIcon className="size-3.5" />
											Reconectar
										</Button>
									)}
									<Button
										size="sm"
										variant="ghost"
										onClick={() => setConfirmDeleteId(inst.id)}
										disabled={actionPending}
										className="text-foreground/50 hover:text-rose-500"
										title="Remover"
									>
										<Trash2Icon className="size-3.5" />
									</Button>
								</div>
							</li>
						);
					})}
				</ul>
			)}

			<ConnectInstanceDialog
				organizationId={organizationId}
				organizationSlug={organizationSlug}
				open={connectOpen}
				onOpenChange={setConnectOpen}
				onCreated={(id) => setQrInstanceId(id)}
			/>

			{qrInstanceId ? (
				<QRCodeDialog
					instanceId={qrInstanceId}
					organizationSlug={organizationSlug}
					open={!!qrInstanceId}
					onOpenChange={(open) => {
						if (!open) setQrInstanceId(null);
					}}
				/>
			) : null}

			<AlertDialog
				open={!!confirmDeleteId}
				onOpenChange={(open) => !open && setConfirmDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remover esta conexão?</AlertDialogTitle>
						<AlertDialogDescription>
							O número será deslogado do WhatsApp e a conexão removida. As
							conversas e mensagens anteriores permanecem no chat.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => confirmDeleteId && doDelete(confirmDeleteId)}
							className="bg-rose-500 hover:bg-rose-600"
						>
							Remover
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
