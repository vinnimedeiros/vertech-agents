"use client";

import { AudioRecorder } from "@saas/chat/components/AudioRecorder";
import { EmojiPickerButton } from "@saas/chat/components/EmojiPickerButton";
import { useMediaOverlay } from "@saas/chat/components/MediaOverlayContext";
import {
	sendMediaMessageAction,
	sendTextMessageAction,
} from "@saas/chat/lib/actions";
import type { ChatMessage } from "@saas/chat/lib/server";
import {
	uploadChatMediaAction,
	type ChatMediaKind,
} from "@saas/chat/lib/upload-actions";
import { Button } from "@ui/components/button";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib";
import {
	FileTextIcon,
	ImageIcon,
	Loader2Icon,
	MicIcon,
	PaperclipIcon,
	SendHorizontalIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
	conversationId: string;
	disabled?: boolean;
	appendMessage: (msg: ChatMessage) => void;
	confirmMessage: (tempId: string, real: ChatMessage) => void;
	removeMessage: (id: string) => void;
};

const KIND_TO_MESSAGE_TYPE: Record<
	ChatMediaKind,
	"IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT"
> = {
	IMAGE: "IMAGE",
	AUDIO: "AUDIO",
	VIDEO: "VIDEO",
	DOCUMENT: "DOCUMENT",
};

function detectKindFromFile(file: File): ChatMediaKind {
	if (file.type.startsWith("image/")) return "IMAGE";
	if (file.type.startsWith("video/")) return "VIDEO";
	if (file.type.startsWith("audio/")) return "AUDIO";
	return "DOCUMENT";
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function newTempId(): string {
	return `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type PendingAttachment = {
	file: File;
	previewUrl: string | null;
	kind: ChatMediaKind;
};

export function MessageComposer({
	conversationId,
	disabled,
	appendMessage,
	confirmMessage,
	removeMessage,
}: Props) {
	const [text, setText] = useState("");
	const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [recording, setRecording] = useState(false);

	const overlay = useMediaOverlay();

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const docInputRef = useRef<HTMLInputElement>(null);

	// Libera URL de preview ao trocar/descartar
	useEffect(() => {
		return () => {
			if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
		};
	}, [attachment]);

	const hasText = text.trim().length > 0;
	const canSend = (hasText || attachment) && !uploading && !disabled;
	const busy = disabled || uploading || recording;

	function pickFile(file: File | null | undefined) {
		if (!file) return;
		setError(null);
		const kind = detectKindFromFile(file);
		// Imagem/vídeo abrem no overlay contido na thread; doc mostra preview inline
		if (kind === "IMAGE" || kind === "VIDEO") {
			overlay.open({
				file,
				kind,
				onSend: async (caption) => {
					try {
						await sendAttachment(file, kind, null, caption);
					} catch (err) {
						setError(
							err instanceof Error ? err.message : "Falha ao enviar",
						);
					}
				},
			});
			return;
		}
		setAttachment({ file, previewUrl: null, kind });
	}

	function clearAttachment() {
		if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
		setAttachment(null);
	}

	async function sendTextOnly(content: string) {
		const tempId = newTempId();
		appendMessage({
			id: tempId,
			conversationId,
			senderType: "USER",
			senderId: null,
			senderName: null,
			senderAvatar: null,
			direction: "OUTBOUND",
			type: "TEXT",
			status: "PENDING",
			text: content,
			mediaUrl: null,
			mediaMimeType: null,
			mediaFileName: null,
			mediaSize: null,
			durationSeconds: null,
			caption: null,
			createdAt: new Date(),
		});

		try {
			const real = await sendTextMessageAction({
				conversationId,
				text: content,
			});
			confirmMessage(tempId, {
				id: real.id,
				conversationId: real.conversationId,
				senderType: real.senderType,
				senderId: real.senderId,
				senderName: real.senderName,
				senderAvatar: real.senderAvatar ?? null,
				direction: real.direction,
				type: real.type,
				status: real.status,
				text: real.text,
				mediaUrl: real.mediaUrl ?? null,
				mediaMimeType: real.mediaMimeType ?? null,
				mediaFileName: real.mediaFileName ?? null,
				mediaSize: real.mediaSize ?? null,
				durationSeconds: real.durationSeconds ?? null,
				caption: real.caption ?? null,
				createdAt: new Date(real.createdAt),
			});
		} catch (err) {
			console.error("[Composer] sendText error", err);
			removeMessage(tempId);
			throw err;
		}
	}

	async function sendAttachment(
		file: File,
		kind: ChatMediaKind,
		durationSeconds: number | null,
		caption: string | null,
	) {
		const tempId = newTempId();
		// Blob URL pra qualquer tipo — renderer usa url pra imagem/vídeo/áudio
		// e pra doc como href. Fica visível imediatamente enquanto sobe.
		const previewUrl = URL.createObjectURL(file);

		appendMessage({
			id: tempId,
			conversationId,
			senderType: "USER",
			senderId: null,
			senderName: null,
			senderAvatar: null,
			direction: "OUTBOUND",
			type: KIND_TO_MESSAGE_TYPE[kind],
			status: "PENDING",
			text: null,
			mediaUrl: previewUrl,
			mediaMimeType: file.type || null,
			mediaFileName: file.name,
			mediaSize: file.size,
			durationSeconds,
			caption,
			createdAt: new Date(),
		});

		setUploading(true);
		try {
			const formData = new FormData();
			formData.append("conversationId", conversationId);
			formData.append("file", file);
			const uploaded = await uploadChatMediaAction(formData);

			const real = await sendMediaMessageAction({
				conversationId,
				type: KIND_TO_MESSAGE_TYPE[uploaded.kind],
				mediaUrl: uploaded.url,
				mediaMimeType: uploaded.mimeType,
				mediaFileName: uploaded.fileName,
				mediaSize: uploaded.size,
				durationSeconds,
				caption,
			});

			if (previewUrl) URL.revokeObjectURL(previewUrl);

			confirmMessage(tempId, {
				id: real.id,
				conversationId: real.conversationId,
				senderType: real.senderType,
				senderId: real.senderId,
				senderName: real.senderName,
				senderAvatar: real.senderAvatar ?? null,
				direction: real.direction,
				type: real.type,
				status: real.status,
				text: real.text,
				mediaUrl: real.mediaUrl ?? null,
				mediaMimeType: real.mediaMimeType ?? null,
				mediaFileName: real.mediaFileName ?? null,
				mediaSize: real.mediaSize ?? null,
				durationSeconds: real.durationSeconds ?? null,
				caption: real.caption ?? null,
				createdAt: new Date(real.createdAt),
			});
		} catch (err) {
			console.error("[Composer] upload/send media error", err);
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			removeMessage(tempId);
			throw err;
		} finally {
			setUploading(false);
		}
	}

	async function handleSend() {
		if (!canSend) return;
		setError(null);
		const content = text.trim();
		const currentAttachment = attachment;

		// Limpa estado visual primeiro pra feedback instantâneo no input
		setText("");
		clearAttachment();
		textareaRef.current?.focus();

		try {
			if (currentAttachment) {
				await sendAttachment(
					currentAttachment.file,
					currentAttachment.kind,
					null,
					content.length > 0 ? content : null,
				);
			} else if (content.length > 0) {
				await sendTextOnly(content);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Falha ao enviar");
		}
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			void handleSend();
		}
	}

	function insertEmoji(emoji: string) {
		const el = textareaRef.current;
		if (!el) {
			setText((t) => t + emoji);
			return;
		}
		const start = el.selectionStart ?? text.length;
		const end = el.selectionEnd ?? text.length;
		const nextText = text.slice(0, start) + emoji + text.slice(end);
		setText(nextText);
		requestAnimationFrame(() => {
			el.focus();
			const pos = start + emoji.length;
			el.setSelectionRange(pos, pos);
		});
	}

	async function handleAudioSend(blob: Blob, durationSeconds: number) {
		const file = new File(
			[blob],
			`voice-${Date.now()}.webm`,
			{ type: blob.type || "audio/webm" },
		);
		setRecording(false);
		try {
			await sendAttachment(file, "AUDIO", durationSeconds, null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Falha ao enviar áudio");
		}
	}

	return (
		<div className="shrink-0 border-t border-border/60 bg-card/30 px-4 py-3">
			{error ? (
				<div className="mb-2 rounded-md bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400">
					{error}
				</div>
			) : null}

			<input
				ref={imageInputRef}
				type="file"
				accept="image/*,video/*"
				className="hidden"
				onChange={(e) => {
					pickFile(e.target.files?.[0]);
					e.target.value = "";
				}}
			/>
			<input
				ref={docInputRef}
				type="file"
				accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv,.zip,.json"
				className="hidden"
				onChange={(e) => {
					pickFile(e.target.files?.[0]);
					e.target.value = "";
				}}
			/>

			{recording ? (
				<AudioRecorder
					onSend={handleAudioSend}
					onCancel={() => setRecording(false)}
				/>
			) : (
				<div className="flex flex-col gap-2">
					{/* Preview do anexo (se houver) */}
					{attachment ? (
						<AttachmentPreview
							attachment={attachment}
							onClear={clearAttachment}
						/>
					) : null}

					<div className="flex items-end gap-2">
						<div className="flex shrink-0 items-center gap-0.5">
							<EmojiPickerButton onSelect={insertEmoji} disabled={busy} />
							<button
								type="button"
								onClick={() => imageInputRef.current?.click()}
								disabled={busy}
								className="rounded-md p-2 text-foreground/60 hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
								title="Anexar imagem ou vídeo"
							>
								<ImageIcon className="size-4" />
							</button>
							<button
								type="button"
								onClick={() => docInputRef.current?.click()}
								disabled={busy}
								className="rounded-md p-2 text-foreground/60 hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
								title="Anexar documento"
							>
								<PaperclipIcon className="size-4" />
							</button>
							<button
								type="button"
								onClick={() => setRecording(true)}
								disabled={busy || !!attachment}
								className="rounded-md p-2 text-foreground/60 hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
								title="Gravar áudio"
							>
								<MicIcon className="size-4" />
							</button>
						</div>

						<Textarea
							ref={textareaRef}
							value={text}
							onChange={(e) => setText(e.target.value)}
							onKeyDown={onKeyDown}
							placeholder={
								attachment
									? "Adicione uma legenda (opcional)..."
									: "Escreva uma mensagem... (Ctrl+Enter envia)"
							}
							disabled={disabled}
							rows={1}
							className={cn(
								"min-h-[40px] max-h-40 resize-none text-sm",
								"focus-visible:ring-1",
							)}
						/>
						<Button
							type="button"
							size="icon"
							onClick={handleSend}
							disabled={!canSend}
							className="h-10 w-10 shrink-0 rounded-full"
						>
							{uploading ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : (
								<SendHorizontalIcon className="size-4" />
							)}
						</Button>
					</div>
				</div>
			)}

		</div>
	);
}

// ============================================================
// Preview do anexo selecionado (antes de enviar)
// ============================================================

function AttachmentPreview({
	attachment,
	onClear,
}: {
	attachment: PendingAttachment;
	onClear: () => void;
}) {
	const { file, previewUrl, kind } = attachment;

	return (
		<div className="relative flex items-center gap-3 rounded-md border border-border/60 bg-background/50 px-3 py-2">
			{kind === "IMAGE" && previewUrl ? (
				<img
					src={previewUrl}
					alt={file.name}
					className="size-14 shrink-0 rounded object-cover"
				/>
			) : kind === "VIDEO" && previewUrl ? (
				<video
					src={previewUrl}
					className="size-14 shrink-0 rounded object-cover"
					muted
				/>
			) : (
				<div className="flex size-14 shrink-0 items-center justify-center rounded bg-foreground/5 text-foreground/60">
					<FileTextIcon className="size-6" />
				</div>
			)}
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-sm font-medium">{file.name}</span>
				<span className="text-[11px] text-foreground/55">
					{formatBytes(file.size)} · {kind.toLowerCase()}
				</span>
			</div>
			<button
				type="button"
				onClick={onClear}
				className="rounded-md p-1.5 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
				aria-label="Descartar anexo"
			>
				<XIcon className="size-4" />
			</button>
		</div>
	);
}
