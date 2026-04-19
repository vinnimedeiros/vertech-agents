"use client";

import { useImageGallery } from "@saas/chat/components/ImageGallery";
import type { ChatMessage } from "@saas/chat/lib/server";
import { cn } from "@ui/lib";
import {
	ChevronRightIcon,
	FileIcon,
	FileTextIcon,
	ImagesIcon,
	MusicIcon,
	VideoIcon,
} from "lucide-react";

type Props = {
	messages: ChatMessage[];
	onExpand: () => void;
};

type MediaKind = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";

function docIcon(mime: string | null) {
	if (!mime) return FileIcon;
	if (mime.startsWith("text/") || mime.includes("pdf")) return FileTextIcon;
	if (mime.startsWith("audio/")) return MusicIcon;
	if (mime.startsWith("video/")) return VideoIcon;
	return FileIcon;
}

/**
 * Card compacto estilo WhatsApp Web: título "Mídia, links e docs" + contador
 * + 4 previews + click abre a tela cheia com abas. Fica sempre no painel
 * principal do contato.
 */
export function ContactMediaGallery({ messages, onExpand }: Props) {
	const gallery = useImageGallery();

	const mediaMessages = messages.filter(
		(m): m is ChatMessage & { mediaUrl: string; type: MediaKind } =>
			!!m.mediaUrl &&
			(m.type === "IMAGE" ||
				m.type === "VIDEO" ||
				m.type === "AUDIO" ||
				m.type === "DOCUMENT"),
	);

	const previewItems = mediaMessages.slice(-4).reverse(); // 4 mais recentes

	return (
		<section className="px-4 py-3">
			<button
				type="button"
				onClick={onExpand}
				className={cn(
					"flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition-colors",
					"hover:bg-foreground/5 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
				)}
			>
				<span className="flex items-center gap-2">
					<ImagesIcon className="size-4 text-foreground/60" />
					<span className="text-[13px] font-medium text-foreground/90">
						Mídia, links e docs
					</span>
				</span>
				<span className="flex items-center gap-1.5 text-[11px] text-foreground/55">
					<span className="tabular-nums">{mediaMessages.length}</span>
					<ChevronRightIcon className="size-3.5" />
				</span>
			</button>

			{previewItems.length > 0 ? (
				<div className="mt-2 grid grid-cols-4 gap-1.5">
					{previewItems.map((m) => (
						<button
							key={m.id}
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								if (m.type === "IMAGE") {
									gallery.open(m.id);
								} else {
									onExpand();
								}
							}}
							className="relative aspect-square overflow-hidden rounded-md bg-foreground/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
							title={m.mediaFileName ?? undefined}
						>
							{m.type === "IMAGE" ? (
								<img
									src={m.mediaUrl}
									alt={m.mediaFileName ?? "Imagem"}
									className="size-full object-cover"
								/>
							) : m.type === "VIDEO" ? (
								<>
									<video
										src={m.mediaUrl}
										className="size-full object-cover"
										muted
										preload="metadata"
									/>
									<span className="absolute inset-0 flex items-center justify-center bg-black/40">
										<VideoIcon className="size-4 text-white" />
									</span>
								</>
							) : (
								<span className="flex size-full items-center justify-center text-foreground/60">
									{(() => {
										const Icon = docIcon(m.mediaMimeType);
										return <Icon className="size-5" />;
									})()}
								</span>
							)}
						</button>
					))}
				</div>
			) : (
				<p className="mt-2 rounded-md bg-foreground/5 px-3 py-3 text-center text-xs text-foreground/55">
					Nenhum arquivo trocado ainda.
				</p>
			)}
		</section>
	);
}
