"use client";

import {
	disconnectGoogleAction,
	syncGoogleCalendarAction,
} from "@saas/integrations/google/lib/actions";
import type { GoogleConnectionStatus } from "@saas/integrations/google/lib/server";
import { IntegrationLogo } from "@saas/shared/components/IntegrationLogo";
import { FloatingPanel } from "@saas/shared/floating";
import { Button } from "@ui/components/button";
import {
	CalendarIcon,
	CheckCircle2Icon,
	CircleDashedIcon,
	Loader2Icon,
	RefreshCwIcon,
	UnplugIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
	hasCredentials: boolean;
	organizationId: string;
	organizationSlug: string;
	status: GoogleConnectionStatus;
};

export function GoogleCalendarIntegrationCard({
	hasCredentials,
	organizationId,
	organizationSlug,
	status,
}: Props) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isDisconnecting, startDisconnect] = useTransition();
	const [isSyncing, startSync] = useTransition();
	const [feedback, setFeedback] = useState<
		| { type: "success"; message: string }
		| { type: "error"; message: string }
		| null
	>(null);

	// Lê resultado do callback OAuth (?googleOauth=success|error&reason=...)
	useEffect(() => {
		const result = searchParams.get("googleOauth");
		if (!result) return;
		if (result === "success") {
			setFeedback({
				type: "success",
				message: "Google Calendar conectado com sucesso.",
			});
		} else {
			const reason = searchParams.get("reason") ?? "unknown";
			setFeedback({
				type: "error",
				message: `Falha ao conectar (${reason}). Tente novamente.`,
			});
		}
		// Limpa query params da URL após exibir feedback
		const url = new URL(window.location.href);
		url.searchParams.delete("googleOauth");
		url.searchParams.delete("reason");
		window.history.replaceState({}, "", url.toString());
	}, [searchParams]);

	const startUrl = `/api/auth/google/start?slug=${encodeURIComponent(
		organizationSlug,
	)}&returnTo=${encodeURIComponent(`/app/${organizationSlug}/crm/integracoes`)}`;

	const handleDisconnect = () => {
		startDisconnect(async () => {
			const res = await disconnectGoogleAction({
				organizationId,
				organizationSlug,
			});
			if (res.ok) {
				setFeedback({
					type: "success",
					message: "Google Calendar desconectado.",
				});
				router.refresh();
			} else {
				setFeedback({
					type: "error",
					message: `Falha ao desconectar (${res.error}).`,
				});
			}
		});
	};

	const handleSync = (force = false) => {
		startSync(async () => {
			const res = await syncGoogleCalendarAction({
				organizationId,
				organizationSlug,
				force,
			});
			if (res.ok) {
				setFeedback({
					type: "success",
					message: `Sincronizado (${res.mode}). ${res.pulled} importados, ${res.pushed} enviados, ${res.deleted} removidos.`,
				});
				router.refresh();
			} else {
				setFeedback({
					type: "error",
					message: `Sync falhou: ${res.error}`,
				});
			}
		});
	};

	return (
		<FloatingPanel variant="elevated" className="flex flex-col gap-4 p-5">
			<header className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<div className="flex size-11 items-center justify-center rounded-md bg-white shadow-sm">
						<IntegrationLogo provider="google" className="size-7" />
					</div>
					<div>
						<h3 className="font-semibold text-sm text-foreground">
							Google Calendar
						</h3>
						<p className="text-xs text-foreground/55">
							Sincronize agenda do CRM com Google Calendar (push e pull em tempo
							real).
						</p>
						{status.connected && status.email ? (
							<p className="mt-1 text-[11px] text-foreground/65">
								Conta:{" "}
								<span className="font-medium text-foreground/80">
									{status.email}
								</span>
							</p>
						) : null}
						{status.connected ? (
							<p className="mt-0.5 text-[11px] text-foreground/55">
								Última sincronização:{" "}
								<span className="font-medium text-foreground/70">
									{formatLastSync(status.lastSyncAt)}
								</span>
							</p>
						) : null}
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					<StatusBadge
						hasCredentials={hasCredentials}
						connected={status.connected}
					/>
					{status.connected ? (
						<>
							<Button
								size="sm"
								variant="outline"
								onClick={() => handleSync(false)}
								disabled={isSyncing || isDisconnecting}
								className="gap-1.5"
								title="Sincronizar agora (delta)"
							>
								{isSyncing ? (
									<Loader2Icon className="size-3.5 animate-spin" />
								) : (
									<RefreshCwIcon className="size-3.5" />
								)}
								Sincronizar
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={handleDisconnect}
								disabled={isDisconnecting || isSyncing}
								className="gap-1.5"
							>
								{isDisconnecting ? (
									<Loader2Icon className="size-3.5 animate-spin" />
								) : (
									<UnplugIcon className="size-3.5" />
								)}
								Desconectar
							</Button>
						</>
					) : (
						<Button
							size="sm"
							asChild
							disabled={!hasCredentials}
							className="gap-1.5"
						>
							{hasCredentials ? (
								<a href={startUrl}>
									<CalendarIcon className="size-3.5" />
									Conectar
								</a>
							) : (
								<span
									aria-disabled
									title="Aguardando configuração admin (Google Cloud OAuth)"
								>
									<CalendarIcon className="size-3.5" />
									Conectar
								</span>
							)}
						</Button>
					)}
				</div>
			</header>

			{!hasCredentials ? (
				<div className="flex items-start gap-2 rounded-md border border-dashed border-border/50 bg-background/30 px-4 py-3">
					<CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-foreground/50" />
					<div className="text-xs text-foreground/65">
						<p className="font-medium text-foreground/80">
							Aguardando configuração inicial.
						</p>
						<p className="mt-0.5">
							Admin precisa cadastrar credenciais OAuth no Google Cloud Console.
							Ver{" "}
							<code className="rounded bg-foreground/5 px-1 py-0.5 font-mono text-[10px]">
								docs/guides/google-cloud-setup.md
							</code>
							.
						</p>
					</div>
				</div>
			) : null}

			{feedback ? (
				<div
					className={`flex items-start gap-2 rounded-md px-4 py-3 text-xs ${
						feedback.type === "success"
							? "border border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
							: "border border-red-500/30 bg-red-500/5 text-red-300"
					}`}
				>
					{feedback.type === "success" ? (
						<CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
					) : (
						<CircleDashedIcon className="mt-0.5 size-4 shrink-0" />
					)}
					<span>{feedback.message}</span>
				</div>
			) : null}
		</FloatingPanel>
	);
}

function formatLastSync(iso: string | null): string {
	if (!iso) return "Nunca (clique em Sincronizar pra fazer o primeiro pull)";
	const date = new Date(iso);
	const diffMs = Date.now() - date.getTime();
	const diffMin = Math.round(diffMs / 60000);
	if (diffMin < 1) return "agora há pouco";
	if (diffMin < 60) return `${diffMin} min atrás`;
	const diffHours = Math.round(diffMin / 60);
	if (diffHours < 24) return `${diffHours} h atrás`;
	const diffDays = Math.round(diffHours / 24);
	if (diffDays < 30) return `${diffDays} dias atrás`;
	return date.toLocaleString("pt-BR");
}

function StatusBadge({
	hasCredentials,
	connected,
}: {
	hasCredentials: boolean;
	connected: boolean;
}) {
	if (connected) {
		return (
			<span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
				<span className="size-1.5 rounded-full bg-emerald-400" />
				Conectado
			</span>
		);
	}
	if (!hasCredentials) {
		return (
			<span className="flex items-center gap-1.5 rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-medium text-foreground/55">
				<span className="size-1.5 rounded-full bg-foreground/40" />
				Pendente admin
			</span>
		);
	}
	return (
		<span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400">
			<span className="size-1.5 rounded-full bg-amber-400" />
			Não conectado
		</span>
	);
}
