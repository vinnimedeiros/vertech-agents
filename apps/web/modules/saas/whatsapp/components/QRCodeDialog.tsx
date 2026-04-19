"use client";

import { useInstanceStatusPolling } from "@saas/whatsapp/hooks/useInstanceStatusPolling";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { cn } from "@ui/lib";
import { CheckCircle2Icon, Loader2Icon, QrCodeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { useEffect, useState } from "react";

type Props = {
	instanceId: string;
	organizationSlug: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function QRCodeDialog({
	instanceId,
	organizationSlug,
	open,
	onOpenChange,
}: Props) {
	const { snapshot, error } = useInstanceStatusPolling({
		instanceId,
		organizationSlug,
		enabled: open,
		intervalMs: 2000,
	});
	const router = useRouter();
	const [closeTimer, setCloseTimer] = useState<number | null>(null);

	// Fecha automaticamente quando CONNECTED
	useEffect(() => {
		if (snapshot?.status === "CONNECTED" && !closeTimer) {
			const t = window.setTimeout(() => {
				onOpenChange(false);
				router.refresh();
			}, 1200);
			setCloseTimer(t);
		}
		return () => {
			if (closeTimer) {
				window.clearTimeout(closeTimer);
			}
		};
	}, [snapshot?.status, closeTimer, onOpenChange, router]);

	const qrCode = snapshot?.qrCode ?? null;
	const status = snapshot?.status ?? "PENDING";
	const isConnected = status === "CONNECTED";
	const showQR = status === "CONNECTING" && qrCode;
	const showSpinner = status === "PENDING" || (status === "CONNECTING" && !qrCode);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Conectar WhatsApp</DialogTitle>
					<DialogDescription>
						Abra o WhatsApp no celular → Aparelhos conectados → Conectar um
						aparelho → Aponte a câmera pro QR abaixo.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col items-center gap-4 py-4">
					{isConnected ? (
						<>
							<div className="flex size-64 items-center justify-center rounded-lg bg-emerald-500/10 p-6">
								<CheckCircle2Icon className="size-20 text-emerald-500" />
							</div>
							<div className="text-center">
								<p className="font-medium text-foreground">
									Conectado com sucesso!
								</p>
								{snapshot?.phoneNumber ? (
									<p className="mt-1 text-xs text-foreground/60">
										Número: +{snapshot.phoneNumber}
									</p>
								) : null}
							</div>
						</>
					) : showQR && qrCode ? (
						<>
							<div className="rounded-lg bg-white p-4">
								<QRCode value={qrCode} size={232} level="M" />
							</div>
							<p
								className={cn(
									"flex items-center gap-2 text-xs text-foreground/60",
								)}
							>
								<Loader2Icon className="size-3 animate-spin" />
								Aguardando leitura…
							</p>
						</>
					) : showSpinner ? (
						<>
							<div className="flex size-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/30">
								<Loader2Icon className="size-10 animate-spin text-foreground/40" />
								<QrCodeIcon className="size-6 text-foreground/30" />
							</div>
							<p className="text-xs text-foreground/60">
								Gerando QR code…
							</p>
						</>
					) : status === "LOGGED_OUT" ? (
						<p className="text-sm text-rose-400">
							Sessão encerrada. Feche e tente novamente.
						</p>
					) : status === "DISCONNECTED" || status === "ERROR" ? (
						// Transients de stream do WA durante handshake são normais —
						// o próximo tick do polling entrega o QR ou CONNECTED.
						<>
							<div className="flex size-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/30">
								<Loader2Icon className="size-10 animate-spin text-foreground/40" />
							</div>
							<p className="text-xs text-foreground/60">Conectando…</p>
						</>
					) : error ? (
						<p className="text-sm text-rose-400">{error}</p>
					) : (
						<p className="text-sm text-foreground/55">Preparando conexão…</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
