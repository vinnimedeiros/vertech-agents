"use client";

import { AudioPlayer } from "@saas/chat/components/AudioPlayer";
import { useImageGallery } from "@saas/chat/components/ImageGallery";
import type { ChatMessage } from "@saas/chat/lib/server";
import { cn } from "@ui/lib";
import { FileIcon, FileTextIcon, MusicIcon, VideoIcon } from "lucide-react";

type Props = {
	message: ChatMessage;
	isOutbound: boolean;
};

function formatSize(bytes: number | null): string {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docIconFor(mime: string | null) {
	if (!mime) return FileIcon;
	if (mime.startsWith("text/") || mime.includes("pdf")) return FileTextIcon;
	if (mime.startsWith("audio/")) return MusicIcon;
	if (mime.startsWith("video/")) return VideoIcon;
	return FileIcon;
}

export function MessageMediaRenderer({ message, isOutbound }: Props) {
	const { type, mediaUrl, mediaMimeType, mediaFileName, mediaSize, caption } =
		message;
	const gallery = useImageGallery();

	if (!mediaUrl) return null;

	if (type === "IMAGE") {
		return (
			<div className="flex flex-col gap-1.5">
				<button
					type="button"
					onClick={() => gallery.open(message.id)}
					className="block overflow-hidden rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
				>
					<img
						src={mediaUrl}
						alt={mediaFileName ?? "Imagem"}
						className="max-h-80 max-w-full rounded-lg object-cover"
					/>
				</button>
				{caption ? (
					<p className="whitespace-pre-wrap break-words px-1 text-sm leading-relaxed">
						{caption}
					</p>
				) : null}
			</div>
		);
	}

	if (type === "AUDIO") {
		return (
			<div className="flex w-60 max-w-full flex-col gap-1.5">
				<AudioPlayer
					url={mediaUrl}
					durationHint={message.durationSeconds}
					variant={isOutbound ? "outbound" : "inbound"}
				/>
				{caption ? (
					<p className="whitespace-pre-wrap break-words px-1 text-sm leading-relaxed">
						{caption}
					</p>
				) : null}
			</div>
		);
	}

	if (type === "VIDEO") {
		return (
			<div className="flex flex-col gap-1.5">
				<video
					controls
					src={mediaUrl}
					className="max-h-80 max-w-full rounded-lg"
					preload="metadata"
				/>
				{caption ? (
					<p className="whitespace-pre-wrap break-words px-1 text-sm leading-relaxed">
						{caption}
					</p>
				) : null}
			</div>
		);
	}

	// DOCUMENT (ou fallback)
	const Icon = docIconFor(mediaMimeType);
	return (
		<a
			href={mediaUrl}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				"flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
				isOutbound
					? "bg-white/10 hover:bg-white/15"
					: "bg-foreground/5 hover:bg-foreground/8",
			)}
		>
			<Icon className="size-5 shrink-0 text-foreground/70" />
			<div className="flex min-w-0 flex-col">
				<span className="truncate font-medium">
					{mediaFileName ?? "Arquivo"}
				</span>
				{mediaSize ? (
					<span className="text-[10px] text-foreground/55">
						{formatSize(mediaSize)}
					</span>
				) : null}
			</div>
		</a>
	);
}
