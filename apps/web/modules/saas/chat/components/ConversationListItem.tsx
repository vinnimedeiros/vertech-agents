"use client";

import {
	deleteConversationAction,
	togglePinConversationAction,
} from "@saas/chat/lib/actions";
import type { ConversationListItem as ConversationListItemType } from "@saas/chat/lib/server";
import { CHANNEL_COLOR } from "@saas/chat/lib/status-config";
import { formatRelativeShort } from "@saas/chat/lib/time";
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
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { cn } from "@ui/lib";
import {
	CheckIcon,
	CheckCheckIcon,
	ClockIcon,
	MailIcon,
	MessageCircleIcon,
	MonitorIcon,
	PinIcon,
	PinOffIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type Props = {
	conversation: ConversationListItemType;
	isSelected: boolean;
	onSelect: (id: string) => void;
	organizationSlug: string;
};

function initialsOf(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("");
}

function ChannelIcon({ channel }: { channel: ConversationListItemType["channel"] }) {
	const className = cn("size-3.5", CHANNEL_COLOR[channel]);
	if (channel === "EMAIL") return <MailIcon className={className} />;
	if (channel === "WEBCHAT") return <MonitorIcon className={className} />;
	return <MessageCircleIcon className={className} />;
}

/**
 * Renderiza o ícone de status da última mensagem outbound (estilo WhatsApp).
 * - PENDING/QUEUED: relógio
 * - SENT: ✓
 * - DELIVERED: ✓✓
 * - READ: ✓✓ azul
 * - FAILED: triângulo de alerta
 * Inbound (recebida) não mostra ícone.
 */
function OutboundStatusIcon({
	status,
}: {
	status: ConversationListItemType["lastMessageStatus"];
}) {
	if (!status) return null;
	const base = "size-3.5 shrink-0";
	if (status === "PENDING" || status === "QUEUED" || status === "PROCESSING") {
		return <ClockIcon className={cn(base, "text-foreground/40")} />;
	}
	if (status === "SENT") {
		return <CheckIcon className={cn(base, "text-foreground/55")} />;
	}
	if (status === "DELIVERED") {
		return <CheckCheckIcon className={cn(base, "text-foreground/55")} />;
	}
	if (status === "READ") {
		return <CheckCheckIcon className={cn(base, "text-sky-400")} />;
	}
	if (status === "FAILED") {
		return <TriangleAlertIcon className={cn(base, "text-rose-500")} />;
	}
	return null;
}

export function ConversationListItem({
	conversation,
	isSelected,
	onSelect,
	organizationSlug,
}: Props) {
	const {
		contact,
		lastMessageAt,
		lastMessagePreview,
		lastMessageDirection,
		lastMessageStatus,
		unreadCount,
		channel,
	} = conversation;
	const displayName =
		contact.name?.trim() || contact.phone || contact.lid || "Sem nome";
	const hasUnread = unreadCount > 0;
	const isPinned = !!conversation.pinnedAt;
	const isOutbound = lastMessageDirection === "OUTBOUND";

	const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [pending, startTransition] = useTransition();
	const menuRef = useRef<HTMLDivElement>(null);
	const router = useRouter();

	// Fecha menu ao clicar fora ou apertar Esc
	useEffect(() => {
		if (!menu) return;
		const onClick = (e: MouseEvent) => {
			if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setMenu(null);
		};
		document.addEventListener("mousedown", onClick);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onClick);
			document.removeEventListener("keydown", onKey);
		};
	}, [menu]);

	function handleContextMenu(e: React.MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		setMenu({ x: e.clientX, y: e.clientY });
	}

	function togglePin() {
		setMenu(null);
		startTransition(async () => {
			try {
				const res = await togglePinConversationAction(
					conversation.id,
					organizationSlug,
				);
				toast.success(res.pinned ? "Conversa fixada" : "Conversa desafixada");
				router.refresh();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao fixar",
				);
			}
		});
	}

	function doDelete() {
		setConfirmDelete(false);
		startTransition(async () => {
			try {
				await deleteConversationAction(conversation.id, organizationSlug);
				toast.success("Conversa excluída");
				router.refresh();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao excluir",
				);
			}
		});
	}

	return (
		<>
			<button
				type="button"
				onClick={() => onSelect(conversation.id)}
				onContextMenu={handleContextMenu}
				disabled={pending}
				className={cn(
					"w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors",
					"hover:bg-foreground/5 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
					isSelected && "bg-foreground/[0.06]",
					pending && "opacity-60",
				)}
			>
				<Avatar className="size-11 rounded-full shrink-0">
					{contact.photoUrl ? (
						<AvatarImage
							src={contact.photoUrl}
							alt={displayName}
							className="rounded-full"
						/>
					) : null}
					<AvatarFallback className="rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm">
						{initialsOf(displayName) || "?"}
					</AvatarFallback>
				</Avatar>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span
							className={cn(
								"truncate text-sm",
								hasUnread
									? "font-semibold text-foreground"
									: "font-medium text-foreground/90",
							)}
						>
							{displayName}
						</span>
						{isPinned ? (
							<PinIcon className="size-3 shrink-0 text-foreground/50" />
						) : null}
						<span className="ml-auto shrink-0 text-[11px] text-foreground/50">
							{formatRelativeShort(lastMessageAt)}
						</span>
					</div>
					<div className="mt-0.5 flex items-center gap-1.5">
						<ChannelIcon channel={channel} />
						{isOutbound ? (
							<OutboundStatusIcon status={lastMessageStatus} />
						) : null}
						<span
							className={cn(
								"truncate text-xs",
								hasUnread ? "text-foreground/90" : "text-foreground/55",
							)}
						>
							{lastMessagePreview?.trim() || "Sem mensagens"}
						</span>
						{hasUnread ? (
							<span className="ml-auto shrink-0 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
								{unreadCount > 99 ? "99+" : unreadCount}
							</span>
						) : null}
					</div>
				</div>
			</button>

			{menu && typeof document !== "undefined"
				? createPortal(
						<div
							ref={menuRef}
							style={{
								top: Math.min(menu.y, window.innerHeight - 100),
								left: Math.min(menu.x, window.innerWidth - 200),
							}}
							className="fixed z-[9999] min-w-[180px] overflow-hidden rounded-md border border-border/60 bg-popover p-1 shadow-lg"
							onClick={(e) => e.stopPropagation()}
						>
							<button
								type="button"
								onClick={togglePin}
								className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-foreground/5"
							>
								{isPinned ? (
									<>
										<PinOffIcon className="size-3.5 text-foreground/60" />
										Desafixar conversa
									</>
								) : (
									<>
										<PinIcon className="size-3.5 text-foreground/60" />
										Fixar conversa
									</>
								)}
							</button>
							<button
								type="button"
								onClick={() => {
									setMenu(null);
									setConfirmDelete(true);
								}}
								className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-rose-500 transition-colors hover:bg-rose-500/10"
							>
								<Trash2Icon className="size-3.5" />
								Excluir conversa
							</button>
						</div>,
						document.body,
					)
				: null}

			<AlertDialog
				open={confirmDelete}
				onOpenChange={(o) => !o && setConfirmDelete(false)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
						<AlertDialogDescription>
							Essa ação remove a conversa e todas as mensagens do histórico.
							O contato continua salvo. Não dá pra desfazer.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={doDelete}
							className="bg-rose-500 hover:bg-rose-600"
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
