"use client";

import { EmojiPickerButton } from "@saas/chat/components/EmojiPickerButton";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { Loader2Icon, SendHorizontalIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type MediaComposerKind = "IMAGE" | "VIDEO";

type Props = {
	open: boolean;
	file: File | null;
	kind: MediaComposerKind;
	onClose: () => void;
	onSend: (caption: string | null) => void | Promise<void>;
};

/**
 * Overlay fullscreen pra envio de imagem/vídeo — estilo WhatsApp Web:
 * prévia grande no centro, caption com emoji embaixo, botão enviar circular.
 */
export function MediaComposerOverlay({
	open,
	file,
	kind,
	onClose,
	onSend,
}: Props) {
	const [caption, setCaption] = useState("");
	const [sending, setSending] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Gera blob URL local pra prévia — libera ao fechar
	useEffect(() => {
		if (!file || !open) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file, open]);

	// Reset caption ao abrir
	useEffect(() => {
		if (open) {
			setCaption("");
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open]);

	// Atalhos: Esc fecha, Enter envia
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			}
		};
		window.addEventListener("keydown", handler);
		const overflowOrig = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", handler);
			document.body.style.overflow = overflowOrig;
		};
	}, [open, onClose]);

	if (!open || !file) return null;

	async function handleSend() {
		if (sending) return;
		setSending(true);
		try {
			const trimmed = caption.trim();
			await onSend(trimmed.length > 0 ? trimmed : null);
		} finally {
			setSending(false);
		}
	}

	function insertEmoji(emoji: string) {
		const el = inputRef.current;
		if (!el) {
			setCaption((c) => c + emoji);
			return;
		}
		const start = el.selectionStart ?? caption.length;
		const end = el.selectionEnd ?? caption.length;
		const next = caption.slice(0, start) + emoji + caption.slice(end);
		setCaption(next);
		requestAnimationFrame(() => {
			el.focus();
			const pos = start + emoji.length;
			el.setSelectionRange(pos, pos);
		});
	}

	return (
		<div className="absolute inset-0 z-20 flex flex-col bg-black/95 backdrop-blur-sm">
			{/* Top: fechar + nome */}
			<div className="flex items-center justify-between px-4 py-2.5">
				<button
					type="button"
					onClick={onClose}
					disabled={sending}
					className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
					aria-label="Cancelar"
				>
					<XIcon className="size-4" />
				</button>
				<div className="truncate text-[11px] text-white/55">
					{file.name} · {formatBytes(file.size)}
				</div>
				<div className="w-8" />
			</div>

			{/* Centro: prévia */}
			<div className="flex flex-1 items-center justify-center overflow-hidden px-4 py-2">
				{previewUrl ? (
					kind === "IMAGE" ? (
						<img
							src={previewUrl}
							alt={file.name}
							className="max-h-full max-w-full rounded-lg object-contain shadow-xl"
						/>
					) : (
						<video
							src={previewUrl}
							controls
							className="max-h-full max-w-full rounded-lg shadow-xl"
						/>
					)
				) : null}
			</div>

			{/* Footer: caption + enviar */}
			<div className="flex items-center gap-2 px-4 py-3">
				<div className="flex min-w-0 flex-1 items-center gap-1 rounded-full bg-white/10 pl-1 pr-3 text-white">
					<EmojiPickerButton onSelect={insertEmoji} disabled={sending} />
					<input
						ref={inputRef}
						value={caption}
						onChange={(e) => setCaption(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								void handleSend();
							}
						}}
						placeholder="Adicione uma legenda…"
						disabled={sending}
						className={cn(
							"min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none",
							"placeholder:text-white/40",
						)}
					/>
				</div>
				<Button
					type="button"
					size="icon"
					onClick={handleSend}
					disabled={sending}
					className="size-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
				>
					{sending ? (
						<Loader2Icon className="size-4 animate-spin" />
					) : (
						<SendHorizontalIcon className="size-4" />
					)}
				</Button>
			</div>
		</div>
	);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
