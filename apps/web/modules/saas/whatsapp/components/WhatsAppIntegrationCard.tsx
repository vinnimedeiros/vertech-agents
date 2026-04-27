"use client";

import { IntegrationLogo } from "@saas/shared/components/IntegrationLogo";
import { FloatingPanel } from "@saas/shared/floating";
import { ConnectInstanceDialog } from "@saas/whatsapp/components/ConnectInstanceDialog";
import { QRCodeDialog } from "@saas/whatsapp/components/QRCodeDialog";
import { SwitchInstanceDialog } from "@saas/whatsapp/components/SwitchInstanceDialog";
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
	ArrowLeftRightIcon,
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
	const [switchOpen, setSwitchOpen] = useState(false);
	const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [actionPending, startAction] = useTransition();
	const router = useRouter();

	// "Trocar" só faz sentido com exatamente 1 instance — caso comum. Quando
	// há múltiplas, mantemos "Conectar número" (legado pra adicionar mais).
	const primaryInstance = instances.length === 1 ? instances[0] : null;

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

	const connectedCount = instances.filter(
		(i) => i.status === "CONNECTED",
	).length;

	return (
		<FloatingPanel variant="elevated" className="flex flex-col gap-4 p-5">
			<header className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<div className="flex size-11 items-center justify-center rounded-md bg-emerald-500/10">
						<IntegrationLogo provider="whatsapp" className="size-7" />
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
				<div className="flex shrink-0 items-center gap-2">
					{instances.length > 0 ? (
						<span
							className={cn(
								"flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
								connectedCount > 0
									? "bg-emerald-500/10 text-emerald-400"
									: "bg-amber-500/10 text-amber-400",
							)}
						>
							<span
								className={cn(
									"size-1.5 rounded-full",
									connectedCount > 0 ? "bg-emerald-400" : "bg-amber-400",
								)}
							/>
							{connectedCount > 0
								? `${connectedCount} conectado${connectedCount > 1 ? "s" : ""}`
								: "Pendente"}
						</span>
					) : null}
					{primaryInstance ? (
						<Button
							size="sm"
							onClick={() => setSwitchOpen(true)}
							className="gap-1.5"
						>
							<ArrowLeftRightIcon className="size-3.5" />
							Trocar número
						</Button>
					) : (
						<Button
							size="sm"
							onClick={() => setConnectOpen(true)}
							className="gap-1.5"
						>
							<PlusIcon className="size-3.5" />
							Conectar número
						</Button>
					)}
				</div>
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

			{primaryInstance ? (
				<SwitchInstanceDialog
					oldInstanceId={primaryInstance.id}
					currentName={primaryInstance.name}
					organizationSlug={organizationSlug}
					open={switchOpen}
					onOpenChange={setSwitchOpen}
					onSwitched={(id) => {
						setQrInstanceId(id);
						router.refresh();
					}}
				/>
			) : null}

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
							O número será deslogado e a conexão removida. Conversas e
							contatos criados via WhatsApp (sem lead promovido) também
							serão apagados.
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
		</FloatingPanel>
	);
}
