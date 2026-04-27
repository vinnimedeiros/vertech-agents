"use client";

import { startConversationWithMessageAction } from "@saas/whatsapp-contacts/lib/actions";
import { FloatingPanel } from "@saas/shared/floating";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib";
import {
	Loader2Icon,
	MessageSquarePlusIcon,
	SendHorizontalIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type Props = {
	contact: {
		id: string;
		name: string;
		phone: string | null;
		photoUrl: string | null;
	};
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

export function DraftThreadPanel({ contact, organizationSlug }: Props) {
	const [text, setText] = useState("");
	const [pending, startTransition] = useTransition();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const router = useRouter();

	const displayName = contact.name?.trim() || contact.phone || "Sem nome";
	const canSend = text.trim().length > 0 && !pending;

	function handleSend() {
		if (!canSend) return;
		const content = text.trim();
		startTransition(async () => {
			try {
				const { conversationId } = await startConversationWithMessageAction(
					contact.id,
					content,
					organizationSlug,
				);
				router.replace(
					`/app/${organizationSlug}/crm/chat/${conversationId}`,
				);
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao iniciar conversa",
				);
			}
		});
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleSend();
		}
	}

	return (
		<section className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3">
			<FloatingPanel
				as="header"
				variant="tight"
				className="flex shrink-0 items-center gap-3 px-4 py-2.5"
			>
				<Avatar className="size-9 rounded-full shrink-0">
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
					<div className="truncate text-sm font-semibold text-foreground">
						{displayName}
					</div>
					<div className="mt-0.5 text-[11px] text-foreground/55">
						Nova conversa · {contact.phone ?? "Sem telefone"}
					</div>
				</div>
			</FloatingPanel>

			<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
				<div className="flex size-10 items-center justify-center rounded-full bg-foreground/5">
					<MessageSquarePlusIcon className="size-5 text-foreground/40" />
				</div>
				<p className="text-sm font-medium text-foreground/70">
					Comece a conversa
				</p>
				<p className="max-w-xs text-xs text-foreground/50">
					Envie a primeira mensagem pra criar essa conversa. Se sair sem enviar,
					nada é salvo.
				</p>
			</div>

			<FloatingPanel variant="elevated" className="shrink-0 px-4 py-3">
				<div className="flex items-end gap-2">
					<Textarea
						ref={textareaRef}
						value={text}
						onChange={(e) => setText(e.target.value)}
						onKeyDown={onKeyDown}
						placeholder="Escreva a primeira mensagem... (Ctrl+Enter envia)"
						rows={2}
						disabled={pending}
						className={cn(
							"min-h-[60px] max-h-48 resize-none text-sm border-transparent bg-transparent shadow-none",
							"focus-visible:ring-1",
						)}
						autoFocus
					/>
					<Button
						type="button"
						size="icon"
						onClick={handleSend}
						disabled={!canSend}
						className="h-11 w-11 shrink-0 rounded-full"
					>
						{pending ? (
							<Loader2Icon className="size-4 animate-spin" />
						) : (
							<SendHorizontalIcon className="size-4" />
						)}
					</Button>
				</div>
			</FloatingPanel>
		</section>
	);
}
