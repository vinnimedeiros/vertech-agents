"use client";

import { useImageGallery } from "@saas/chat/components/ImageGallery";
import type { ChatMessage } from "@saas/chat/lib/server";
import { cn } from "@ui/lib";
import {
	ArrowLeftIcon,
	FileIcon,
	FileTextIcon,
	MusicIcon,
	VideoIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
	messages: ChatMessage[];
	onBack: () => void;
};

type Tab = "MEDIA" | "DOCS" | "LINKS";

const URL_REGEX =
	/\b(https?:\/\/[^\s<>'"`]+|www\.[^\s<>'"`]+)\b/gi;

function docIcon(mime: string | null) {
	if (!mime) return FileIcon;
	if (mime.startsWith("text/") || mime.includes("pdf")) return FileTextIcon;
	if (mime.startsWith("audio/")) return MusicIcon;
	if (mime.startsWith("video/")) return VideoIcon;
	return FileIcon;
}

function formatSize(bytes: number | null): string {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function monthLabel(d: Date): string {
	const now = new Date();
	const date = new Date(d);
	if (
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth()
	) {
		return "Neste mês";
	}
	return date
		.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
		.replace(/^./, (c) => c.toUpperCase());
}

function hostOf(url: string): string {
	try {
		const u = new URL(url.startsWith("http") ? url : `https://${url}`);
		return u.hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

/**
 * Tela cheia no painel direito com 3 abas — Mídia, Documentos, Links.
 * Mídia = IMAGE+VIDEO, Docs = DOCUMENT+AUDIO, Links = URLs extraídas dos textos.
 */
export function ContactMediaFullPanel({ messages, onBack }: Props) {
	const [tab, setTab] = useState<Tab>("MEDIA");
	const gallery = useImageGallery();

	const mediaItems = useMemo(
		() =>
			messages.filter(
				(m) =>
					(m.type === "IMAGE" || m.type === "VIDEO") && !!m.mediaUrl,
			),
		[messages],
	);

	const docItems = useMemo(
		() =>
			messages.filter(
				(m) =>
					(m.type === "DOCUMENT" || m.type === "AUDIO") && !!m.mediaUrl,
			),
		[messages],
	);

	const linkItems = useMemo(() => {
		const out: { messageId: string; url: string; createdAt: Date }[] = [];
		for (const m of messages) {
			if (!m.text) continue;
			const matches = m.text.match(URL_REGEX);
			if (!matches) continue;
			for (const url of matches) {
				out.push({ messageId: m.id, url, createdAt: m.createdAt });
			}
		}
		return out;
	}, [messages]);

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<header className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-3">
				<button
					type="button"
					onClick={onBack}
					className="flex size-8 items-center justify-center rounded-full text-foreground/70 hover:bg-foreground/5"
					aria-label="Voltar"
				>
					<ArrowLeftIcon className="size-4" />
				</button>
				<span className="text-sm font-semibold text-foreground">
					Mídia, links e docs
				</span>
			</header>

			<nav className="flex shrink-0 border-b border-border/60 px-2">
				{[
					{ key: "MEDIA" as Tab, label: "Mídia", count: mediaItems.length },
					{ key: "DOCS" as Tab, label: "Documentos", count: docItems.length },
					{ key: "LINKS" as Tab, label: "Links", count: linkItems.length },
				].map((t) => {
					const active = tab === t.key;
					return (
						<button
							key={t.key}
							type="button"
							onClick={() => setTab(t.key)}
							className={cn(
								"flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs transition-colors",
								active
									? "border-primary font-semibold text-foreground"
									: "border-transparent text-foreground/55 hover:text-foreground/80",
							)}
						>
							{t.label}
							{t.count > 0 ? (
								<span className="rounded-full bg-foreground/10 px-1.5 text-[10px] tabular-nums text-foreground/70">
									{t.count}
								</span>
							) : null}
						</button>
					);
				})}
			</nav>

			<div className="flex-1 overflow-y-auto px-3 py-3">
				{tab === "MEDIA" ? (
					<MediaTab items={mediaItems} onOpenImage={gallery.open} />
				) : tab === "DOCS" ? (
					<DocsTab items={docItems} />
				) : (
					<LinksTab items={linkItems} />
				)}
			</div>
		</div>
	);
}

// ============================================================
// Mídia (imagens + vídeos) agrupado por mês
// ============================================================

function MediaTab({
	items,
	onOpenImage,
}: {
	items: ChatMessage[];
	onOpenImage: (id: string) => void;
}) {
	const groups = useMemo(() => {
		// Mais recentes primeiro
		const sorted = [...items].sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		const out: { label: string; items: ChatMessage[] }[] = [];
		let currentLabel: string | null = null;
		for (const m of sorted) {
			const label = monthLabel(m.createdAt);
			if (label !== currentLabel) {
				out.push({ label, items: [] });
				currentLabel = label;
			}
			out[out.length - 1].items.push(m);
		}
		return out;
	}, [items]);

	if (items.length === 0) {
		return (
			<p className="py-10 text-center text-xs text-foreground/55">
				Nenhuma imagem ou vídeo nessa conversa.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{groups.map((g) => (
				<div key={g.label}>
					<h5 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
						{g.label}
					</h5>
					<div className="grid grid-cols-3 gap-1.5">
						{g.items.map((m) => (
							<button
								key={m.id}
								type="button"
								onClick={() =>
									m.type === "IMAGE"
										? onOpenImage(m.id)
										: window.open(m.mediaUrl ?? "", "_blank")
								}
								className="relative aspect-square overflow-hidden rounded-md bg-foreground/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
							>
								{m.type === "IMAGE" ? (
									<img
										src={m.mediaUrl ?? ""}
										alt={m.mediaFileName ?? "Imagem"}
										className="size-full object-cover"
									/>
								) : (
									<>
										<video
											src={m.mediaUrl ?? ""}
											className="size-full object-cover"
											muted
											preload="metadata"
										/>
										<span className="absolute inset-0 flex items-center justify-center bg-black/40">
											<VideoIcon className="size-5 text-white" />
										</span>
									</>
								)}
							</button>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

// ============================================================
// Docs (DOCUMENT + AUDIO)
// ============================================================

function DocsTab({ items }: { items: ChatMessage[] }) {
	if (items.length === 0) {
		return (
			<p className="py-10 text-center text-xs text-foreground/55">
				Nenhum documento ou áudio nessa conversa.
			</p>
		);
	}
	const sorted = [...items].sort(
		(a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
	return (
		<ul className="flex flex-col gap-1.5">
			{sorted.map((m) => {
				const Icon = docIcon(m.mediaMimeType);
				const defaultName =
					m.type === "AUDIO" ? "Áudio" : m.mediaFileName ?? "Arquivo";
				return (
					<li key={m.id}>
						<a
							href={m.mediaUrl ?? ""}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 rounded-md bg-foreground/5 px-3 py-2 text-xs transition-colors hover:bg-foreground/10"
						>
							<Icon className="size-4 shrink-0 text-foreground/60" />
							<div className="flex min-w-0 flex-col">
								<span className="truncate font-medium">
									{m.mediaFileName ?? defaultName}
								</span>
								{m.mediaSize ? (
									<span className="text-[10px] text-foreground/55">
										{formatSize(m.mediaSize)}
									</span>
								) : null}
							</div>
						</a>
					</li>
				);
			})}
		</ul>
	);
}

// ============================================================
// Links (URLs extraídas de textos)
// ============================================================

function LinksTab({
	items,
}: {
	items: { messageId: string; url: string; createdAt: Date }[];
}) {
	if (items.length === 0) {
		return (
			<p className="py-10 text-center text-xs text-foreground/55">
				Nenhum link compartilhado nessa conversa.
			</p>
		);
	}
	const sorted = [...items].sort(
		(a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
	return (
		<ul className="flex flex-col gap-1.5">
			{sorted.map((l, idx) => {
				const href = l.url.startsWith("http") ? l.url : `https://${l.url}`;
				return (
					<li key={`${l.messageId}-${idx}`}>
						<a
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="flex flex-col gap-0.5 rounded-md bg-foreground/5 px-3 py-2 text-xs transition-colors hover:bg-foreground/10"
						>
							<span className="truncate font-medium text-primary/90">
								{l.url}
							</span>
							<span className="text-[10px] text-foreground/55">
								{hostOf(l.url)}
							</span>
						</a>
					</li>
				);
			})}
		</ul>
	);
}
