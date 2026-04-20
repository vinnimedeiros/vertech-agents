"use client";

import { Button } from "@ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib";
import { ArrowUpIcon, Loader2Icon, SquareIcon } from "lucide-react";
import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useState,
} from "react";
import { useAutoResizeTextarea } from "../../hooks/useAutoResizeTextarea";
import type { ArchitectAttachment } from "../../lib/attachment-helpers";
import { AttachmentPendingCard } from "./AttachmentPendingCard";
import { CharCounter } from "./CharCounter";

type Props = {
	onSend: (text: string) => void | Promise<void>;
	onOpenAttachmentMenu?: () => void;
	attachmentSlot?: ReactNode;
	attachments?: ArchitectAttachment[];
	onRemoveAttachment?: (id: string) => void;
	disabled?: boolean;
	blocked?: boolean;
	maxChars?: number;
	onStop?: () => void;
	isStreaming?: boolean;
	isWaitingReply?: boolean;
};

const DEFAULT_MAX_CHARS = 4000;
const MAX_ROWS = 8;

/**
 * Composer do chat do Arquiteto (story 09.3).
 *
 * Features:
 * - Textarea expansivel 1->8 rows via hook useAutoResizeTextarea
 * - Botao anexar `Paperclip` (disabled nesta story — 09.4 plugará o menu)
 * - Botao enviar `ArrowUp` com 3 estados (idle/enabled/submitting)
 * - Shortcuts: Enter envia, Shift+Enter quebra linha, Cmd/Ctrl+K abre menu anexo
 * - Guard de IME: `e.isComposing` evita envio durante composicao de caracteres
 * - Placeholder dinamico: idle / blocked / offline
 * - CharCounter com 3 thresholds (3500/3900/4000) — bloqueia envio em >=max
 *
 * API controlled-free: o component gerencia seu proprio estado interno.
 * Na 09.5 vamos refatorar pra aceitar value+onChange como props tambem
 * (dual controlled/uncontrolled).
 */
export function ArchitectComposer({
	onSend,
	onOpenAttachmentMenu,
	attachmentSlot,
	attachments = [],
	onRemoveAttachment,
	disabled = false,
	blocked = false,
	maxChars = DEFAULT_MAX_CHARS,
	onStop,
	isStreaming = false,
	isWaitingReply = false,
}: Props) {
	const [value, setValue] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isOnline, setIsOnline] = useState(true);
	const textareaRef = useAutoResizeTextarea({ value, maxRows: MAX_ROWS });

	// Online/offline detection — placeholder troca em AC8
	useEffect(() => {
		if (typeof navigator === "undefined") return;
		setIsOnline(navigator.onLine);
		const goOnline = () => setIsOnline(true);
		const goOffline = () => setIsOnline(false);
		window.addEventListener("online", goOnline);
		window.addEventListener("offline", goOffline);
		return () => {
			window.removeEventListener("online", goOnline);
			window.removeEventListener("offline", goOffline);
		};
	}, []);

	const trimmed = value.trim();
	const hasContent = trimmed.length > 0;
	const isOverLimit = value.length >= maxChars;
	const hasUploadingAttachment = attachments.some(
		(a) => a.status === "uploading",
	);
	const canSubmit =
		hasContent &&
		!isOverLimit &&
		!disabled &&
		!blocked &&
		!isSubmitting &&
		!hasUploadingAttachment;

	const send = useCallback(async () => {
		if (!canSubmit) return;
		const textToSend = trimmed;
		// Limpa input imediato antes do await — UX: user vê msg subir
		// pra lista + campo zerado instantaneamente, mesmo que o stream
		// demore segundos pra chegar.
		setValue("");
		setIsSubmitting(true);
		try {
			await onSend(textToSend);
		} catch {
			// Em caso de falha, recupera o texto pra user tentar de novo.
			setValue(textToSend);
		} finally {
			setIsSubmitting(false);
		}
	}, [canSubmit, trimmed, onSend]);

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		// Guard IME (AC15): Enter NAO envia durante composicao
		if (e.nativeEvent.isComposing) return;

		// ESC aborta stream em andamento (09.5 AC19)
		if (e.key === "Escape" && isStreaming && onStop) {
			e.preventDefault();
			onStop();
			return;
		}

		// Cmd/Ctrl+K abre menu de anexo (AC14)
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
			e.preventDefault();
			onOpenAttachmentMenu?.();
			return;
		}

		// Enter sem shift envia (AC12)
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void send();
		}
		// Shift+Enter: comportamento default do textarea (AC13)
	};

	const placeholder = !isOnline
		? "Sem conexão. Suas mensagens vão ser enviadas quando voltar."
		: isWaitingReply
			? "Arquiteto está respondendo..."
			: hasUploadingAttachment
				? "Aguardando processar anexos..."
				: blocked
					? "Aguarde um instante..."
					: "Digite sua mensagem...";

	const sendButton =
		isStreaming && onStop ? (
			<Button
				size="icon"
				variant="secondary"
				onClick={onStop}
				aria-label="Parar resposta do Arquiteto"
				className="size-9 shrink-0 self-end"
			>
				<SquareIcon className="size-3.5" />
			</Button>
		) : (
			<Button
				size="icon"
				onClick={() => void send()}
				disabled={!canSubmit}
				aria-label={
					isSubmitting ? "Enviando mensagem" : "Enviar mensagem"
				}
				className="size-9 shrink-0 self-end"
			>
				{isSubmitting ? (
					<Loader2Icon className="size-4 animate-spin" />
				) : (
					<ArrowUpIcon className="size-4" />
				)}
			</Button>
		);

	const hasAttachments = attachments.length > 0;

	return (
		<div className="relative bg-gradient-to-t from-background via-background to-transparent px-3 pt-6 pb-3 md:px-4 md:pb-4">
			<div className="mx-auto max-w-[800px]">
				{hasAttachments ? (
					<div className="mb-2 flex flex-wrap gap-2">
						{attachments.map((attachment) => (
							<AttachmentPendingCard
								key={attachment.id}
								attachment={attachment}
								onRemove={(id) => onRemoveAttachment?.(id)}
							/>
						))}
					</div>
				) : null}
				<div
					className={cn(
						"flex items-end gap-2 rounded-2xl border border-border/60 bg-card/80 p-2 shadow-lg shadow-black/5 backdrop-blur-md transition-colors",
						"focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
						disabled && "opacity-60",
					)}
				>
					{attachmentSlot}

					<textarea
						ref={textareaRef}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={disabled || isSubmitting}
						placeholder={placeholder}
						aria-label="Mensagem para o Arquiteto"
						rows={1}
						className={cn(
							"w-full resize-none border-0 bg-transparent px-1 py-2 text-sm text-foreground transition-all duration-150",
							"placeholder:text-foreground/40 focus-visible:outline-none disabled:cursor-not-allowed",
						)}
					/>

					{isOverLimit ? (
						<TooltipProvider delayDuration={150}>
							<Tooltip>
								<TooltipTrigger asChild>
									{sendButton}
								</TooltipTrigger>
								<TooltipContent>
									Mensagem muito longa, divide em partes.
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					) : (
						sendButton
					)}
				</div>

				<div className="mt-1 flex justify-end">
					<CharCounter current={value.length} max={maxChars} />
				</div>
			</div>
		</div>
	);
}
