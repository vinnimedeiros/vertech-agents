"use client";

import { SHADOW_TOKENS, TINT_BY_COLOR } from "@saas/shared/floating/tokens";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	CalendarIcon,
	CheckIcon,
	CopyIcon,
	ExternalLinkIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatMeetClipboard, parseDurationToMinutes } from "../lib/format-meet";

export type ScheduledEventLike = {
	id: string;
	title: string;
	startAt: Date | string;
	duration: string;
	eventKind: "event" | "meet";
	meetLink: string | null;
	conferenceId: string | null;
};

type Props = {
	event: ScheduledEventLike;
	recipientName?: string | null;
	className?: string;
	/** Quando passado, renderiza botão lixeira no card. Caller faz confirm + delete. */
	onDelete?: (eventId: string) => void;
	/** Desabilita botão delete enquanto operação está em andamento. */
	deleting?: boolean;
};

/**
 * Card visual reusável de evento/reunião — usado tanto na sidebar do
 * LeadModal quanto no resultado pós-criação dentro do EventForm.
 *
 * Anatomia (segue MetricCard pattern):
 *  - Wrapper p-px com gradient diagonal metálico (light/dark)
 *  - Inner bg-card com blur tint sutil (cyan pra Meet, sky pra Event)
 *  - Logo oficial Meet (PNG public/logos/logo-meet.png) ou ícone Calendar
 *  - Data formatada pt-BR + horário + duração
 *  - Pra Meet: link truncado + botões Copiar evento / Abrir
 */
export function ScheduledEventCard({
	event,
	recipientName,
	className,
	onDelete,
	deleting,
}: Props) {
	const [copied, setCopied] = useState(false);

	const startAt =
		typeof event.startAt === "string"
			? new Date(event.startAt)
			: event.startAt;
	const minutes = parseDurationToMinutes(event.duration);
	const endAt = new Date(startAt.getTime() + minutes * 60 * 1000);
	const isMeet = event.eventKind === "meet" && !!event.meetLink;
	const tint = isMeet ? "cyan" : "sky";

	const handleCopy = async () => {
		if (!event.meetLink) return;
		const formatted = formatMeetClipboard({
			title: event.title,
			startAt,
			endAt,
			meetLink: event.meetLink,
			recipientName: recipientName ?? null,
		});
		try {
			await navigator.clipboard.writeText(formatted);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			toast.success("Bloco da reunião copiado");
		} catch {
			toast.error("Não foi possível copiar — selecione manualmente");
		}
	};

	const dateLabel = format(startAt, "EEEE',' d 'de' MMMM", { locale: ptBR });
	const timeLabel = `${format(startAt, "HH:mm")} – ${format(endAt, "HH:mm")}`;

	return (
		<div
			className={cn(
				"rounded-xl p-px",
				"bg-[linear-gradient(135deg,#d4d4d8_0%,#a1a1aa_50%,#d4d4d8_100%)]",
				"dark:bg-[linear-gradient(135deg,rgba(228,228,231,0.40)_0%,rgba(228,228,231,0.04)_30%,rgba(228,228,231,0.04)_70%,rgba(228,228,231,0.40)_100%)]",
				SHADOW_TOKENS.default,
				className,
			)}
		>
			<div className="relative isolate overflow-hidden rounded-[11px] bg-card p-4">
				<div
					aria-hidden
					className={cn(
						"pointer-events-none absolute inset-x-0 top-0 z-0 h-16",
						TINT_BY_COLOR[tint],
					)}
				/>

				<div className="relative z-10 flex flex-col gap-2.5">
					<div className="flex items-start gap-2.5">
						<div
							className={cn(
								"flex size-9 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-foreground/10",
							)}
						>
							{isMeet ? (
								<img
									src="/logos/logo-meet.png"
									alt="Google Meet"
									width={28}
									height={28}
									className="object-contain"
									draggable={false}
								/>
							) : (
								<CalendarIcon className="size-4 text-sky-500" />
							)}
						</div>
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<p
								className="truncate text-[13px] font-medium text-foreground leading-tight"
								title={event.title}
							>
								{event.title}
							</p>
							<p className="text-[11px] capitalize text-foreground/65">
								{dateLabel}
							</p>
							<p className="text-[11px] text-foreground/55">
								{timeLabel} · {event.duration}
							</p>
						</div>
					</div>

					{isMeet && event.meetLink ? (
						<div className="flex flex-col gap-1.5">
							<a
								href={event.meetLink}
								target="_blank"
								rel="noreferrer"
								className="inline-flex w-fit items-center gap-1 truncate rounded bg-foreground/5 px-2 py-1 font-mono text-[10.5px] text-foreground/75 hover:bg-foreground/10"
								title={event.meetLink}
							>
								<span className="truncate">
									{event.meetLink.replace(/^https?:\/\//, "")}
								</span>
								<ExternalLinkIcon className="size-3 shrink-0 text-foreground/45" />
							</a>
							<div className="flex flex-wrap gap-1.5">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleCopy}
									className="h-7 gap-1.5 px-2 text-[11px]"
								>
									{copied ? (
										<>
											<CheckIcon className="size-3" />
											Copiado
										</>
									) : (
										<>
											<CopyIcon className="size-3" />
											Copiar evento + link
										</>
									)}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									asChild
									className="h-7 gap-1.5 px-2 text-[11px]"
								>
									<a
										href={event.meetLink}
										target="_blank"
										rel="noreferrer"
									>
										<ExternalLinkIcon className="size-3" />
										Abrir Meet
									</a>
								</Button>
								{onDelete ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => onDelete(event.id)}
										disabled={deleting}
										title="Excluir reunião"
										className="ml-auto h-7 gap-1.5 px-2 text-[11px] text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
									>
										<Trash2Icon className="size-3" />
										Excluir
									</Button>
								) : null}
							</div>
						</div>
					) : onDelete ? (
						<div className="flex">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => onDelete(event.id)}
								disabled={deleting}
								title="Excluir evento"
								className="ml-auto h-7 gap-1.5 px-2 text-[11px] text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
							>
								<Trash2Icon className="size-3" />
								Excluir
							</Button>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
