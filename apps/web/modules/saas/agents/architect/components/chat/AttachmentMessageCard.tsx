"use client";

import { cn } from "@ui/lib";
import {
	AlertCircleIcon,
	CheckCircle2Icon,
	FileTextIcon,
	ImageIcon,
	LinkIcon,
	Loader2Icon,
} from "lucide-react";
import {
	type ArchitectAttachment,
	formatBytes,
} from "../../lib/attachment-helpers";

type Props = {
	attachment: ArchitectAttachment;
};

/**
 * Mini-card de anexo dentro da bubble da mensagem enviada (story 09.4).
 *
 * Estados pós-envio: `processing` (worker ingestando), `indexed` (chunks
 * prontos pro RAG), `error` (ingest falhou). A subscription Realtime no
 * ChatShell via useDocumentEvents atualiza esse estado em tempo real.
 *
 * Usado pela 09.5 quando bubble de mensagem do usuário for renderizado.
 * Nesta story fica standalone mas já exportado.
 */
export function AttachmentMessageCard({ attachment }: Props) {
	const Icon =
		attachment.kind === "image"
			? ImageIcon
			: attachment.kind === "link"
				? LinkIcon
				: FileTextIcon;

	const { statusIcon, statusLabel } = (() => {
		switch (attachment.status) {
			case "processing":
				return {
					statusIcon: (
						<Loader2Icon className="size-3 animate-spin text-foreground/60" />
					),
					statusLabel: "processando...",
				};
			case "indexed":
				return {
					statusIcon: (
						<CheckCircle2Icon className="size-3 text-emerald-500" />
					),
					statusLabel: "indexado",
				};
			case "error":
				return {
					statusIcon: (
						<AlertCircleIcon className="size-3 text-destructive" />
					),
					statusLabel: attachment.errorMessage || "erro",
				};
			case "ready":
				return {
					statusIcon: (
						<CheckCircle2Icon className="size-3 text-emerald-500" />
					),
					statusLabel: "enviado",
				};
			default:
				return {
					statusIcon: null,
					statusLabel:
						attachment.kind === "link"
							? "Link"
							: formatBytes(attachment.fileSize),
				};
		}
	})();

	return (
		<div
			className={cn(
				"flex max-w-[280px] items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-1.5 text-sm",
				attachment.status === "error" &&
					"border-destructive/40 bg-destructive/5",
			)}
		>
			<Icon className="size-4 shrink-0 text-foreground/70" />
			<div className="flex min-w-0 flex-col">
				<span
					className="truncate font-medium text-xs"
					title={attachment.fileName}
				>
					{attachment.fileName}
				</span>
				<div className="flex items-center gap-1 text-[11px] text-foreground/60">
					{statusIcon}
					<span>{statusLabel}</span>
				</div>
			</div>
		</div>
	);
}
