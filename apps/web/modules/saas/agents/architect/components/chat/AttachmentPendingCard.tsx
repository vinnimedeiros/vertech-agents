"use client";

import { Button } from "@ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib";
import {
	AlertCircleIcon,
	CheckCircle2Icon,
	FileTextIcon,
	ImageIcon,
	LinkIcon,
	Loader2Icon,
	XIcon,
} from "lucide-react";
import {
	type ArchitectAttachment,
	formatBytes,
} from "../../lib/attachment-helpers";

type Props = {
	attachment: ArchitectAttachment;
	onRemove: (id: string) => void;
};

/**
 * Mini-card de anexo antes do envio (story 09.4).
 *
 * Aparece acima do textarea do composer. Status visual: uploading (spinner),
 * ready (check verde), error (ícone vermelho + tooltip com mensagem).
 * Botão [X] remove: aborta request se uploading.
 */
export function AttachmentPendingCard({ attachment, onRemove }: Props) {
	const Icon =
		attachment.kind === "image"
			? ImageIcon
			: attachment.kind === "link"
				? LinkIcon
				: FileTextIcon;

	const isError = attachment.status === "error";

	const statusIcon = (() => {
		switch (attachment.status) {
			case "uploading":
				return (
					<Loader2Icon className="size-3 animate-spin text-foreground/60" />
				);
			case "ready":
				return <CheckCircle2Icon className="size-3 text-emerald-500" />;
			case "error":
				return <AlertCircleIcon className="size-3 text-destructive" />;
			default:
				return null;
		}
	})();

	const sizeLabel =
		attachment.kind === "link"
			? "Link"
			: attachment.fileSize > 0
				? formatBytes(attachment.fileSize)
				: "";

	const card = (
		<div
			className={cn(
				"group flex max-w-[260px] items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm transition-colors",
				isError && "border-destructive/40 bg-destructive/5",
			)}
		>
			<Icon
				className={cn(
					"size-4 shrink-0 text-foreground/70",
					isError && "text-destructive/80",
				)}
			/>
			<div className="flex min-w-0 flex-col">
				<span
					className={cn(
						"truncate font-medium text-xs",
						isError && "text-destructive",
					)}
					title={attachment.fileName}
				>
					{attachment.fileName}
				</span>
				<div className="flex items-center gap-1 text-[11px] text-foreground/60">
					{statusIcon}
					<span>
						{attachment.status === "uploading"
							? "enviando..."
							: attachment.status === "error"
								? "erro"
								: sizeLabel}
					</span>
				</div>
			</div>
			<Button
				variant="ghost"
				size="icon"
				onClick={() => onRemove(attachment.id)}
				aria-label={`Remover ${attachment.fileName}`}
				className="size-6 shrink-0 text-foreground/60 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
			>
				<XIcon className="size-3" />
			</Button>
		</div>
	);

	if (isError && attachment.errorMessage) {
		return (
			<TooltipProvider delayDuration={150}>
				<Tooltip>
					<TooltipTrigger asChild>{card}</TooltipTrigger>
					<TooltipContent>{attachment.errorMessage}</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	return card;
}
