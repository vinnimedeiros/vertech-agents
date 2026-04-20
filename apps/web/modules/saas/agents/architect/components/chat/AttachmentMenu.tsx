"use client";

import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { cn } from "@ui/lib";
import { FileTextIcon, ImageIcon, LinkIcon, PaperclipIcon } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
	DOCUMENT_ACCEPT,
	IMAGE_ACCEPT,
	MAX_ATTACHMENTS,
} from "../../lib/attachment-helpers";
import { UrlAnchorDialog } from "./UrlAnchorDialog";

type Props = {
	disabled?: boolean;
	attachmentCount: number;
	onFilesSelected: (files: File[]) => void;
	onLinkSubmitted: (url: string) => void;
	onLimitReached?: () => void;
};

export type AttachmentMenuHandle = {
	open: () => void;
};

/**
 * Menu de anexos do composer do Arquiteto (story 09.4).
 *
 * DropdownMenu com 3 opções: Arquivo / Imagem / Link. Cada opção dispara
 * `<input type="file">` invisível ou abre o UrlAnchorDialog. O shortcut
 * `Cmd/Ctrl+K` do composer chama `.open()` via ref forward.
 *
 * Limite de 5 anexos totais é enforçado aqui: se atingido, opções ficam
 * desabilitadas e clique dispara `onLimitReached` pra toast.
 */
export const AttachmentMenu = forwardRef<AttachmentMenuHandle, Props>(
	function AttachmentMenu(
		{
			disabled = false,
			attachmentCount,
			onFilesSelected,
			onLinkSubmitted,
			onLimitReached,
		},
		ref,
	) {
		const [open, setOpen] = useState(false);
		const [urlDialogOpen, setUrlDialogOpen] = useState(false);
		const fileInputRef = useRef<HTMLInputElement>(null);
		const imageInputRef = useRef<HTMLInputElement>(null);

		useImperativeHandle(
			ref,
			() => ({
				open: () => {
					if (disabled) return;
					if (attachmentCount >= MAX_ATTACHMENTS) {
						onLimitReached?.();
						return;
					}
					setOpen(true);
				},
			}),
			[disabled, attachmentCount, onLimitReached],
		);

		const limitReached = attachmentCount >= MAX_ATTACHMENTS;

		const handlePickDocument = () => {
			if (limitReached) {
				onLimitReached?.();
				return;
			}
			setOpen(false);
			fileInputRef.current?.click();
		};

		const handlePickImage = () => {
			if (limitReached) {
				onLimitReached?.();
				return;
			}
			setOpen(false);
			imageInputRef.current?.click();
		};

		const handleOpenLinkDialog = () => {
			if (limitReached) {
				onLimitReached?.();
				return;
			}
			setOpen(false);
			setUrlDialogOpen(true);
		};

		const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(e.target.files ?? []);
			if (files.length > 0) {
				const available = MAX_ATTACHMENTS - attachmentCount;
				if (files.length > available) {
					onLimitReached?.();
				}
				onFilesSelected(files.slice(0, available));
			}
			// Reseta input pra permitir re-selecionar o mesmo arquivo.
			e.target.value = "";
		};

		return (
			<>
				<DropdownMenu open={open} onOpenChange={setOpen}>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							disabled={disabled}
							aria-label="Anexar arquivo"
							className={cn(
								"size-9 shrink-0 self-end text-foreground/60 transition-colors hover:text-foreground",
								limitReached && "opacity-50",
							)}
						>
							<PaperclipIcon className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-72"
						sideOffset={8}
					>
						<DropdownMenuItem
							onClick={handlePickDocument}
							disabled={limitReached}
							className="flex flex-col items-start gap-0.5 py-2.5"
						>
							<div className="flex w-full items-center gap-2">
								<FileTextIcon className="size-4 text-foreground/80" />
								<span className="font-medium">Arquivo</span>
							</div>
							<span className="pl-6 text-foreground/60 text-xs">
								PDF, DOCX, CSV, XLSX, TXT (até 10MB cada)
							</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={handlePickImage}
							disabled={limitReached}
							className="flex flex-col items-start gap-0.5 py-2.5"
						>
							<div className="flex w-full items-center gap-2">
								<ImageIcon className="size-4 text-foreground/80" />
								<span className="font-medium">Imagem</span>
							</div>
							<span className="pl-6 text-foreground/60 text-xs">
								PNG, JPG, WEBP (até 5MB)
							</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={handleOpenLinkDialog}
							disabled={limitReached}
							className="flex flex-col items-start gap-0.5 py-2.5"
						>
							<div className="flex w-full items-center gap-2">
								<LinkIcon className="size-4 text-foreground/80" />
								<span className="font-medium">
									Link de site
								</span>
							</div>
							<span className="pl-6 text-foreground/60 text-xs">
								Cole uma URL, o Arquiteto faz a leitura
							</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<input
					ref={fileInputRef}
					type="file"
					accept={DOCUMENT_ACCEPT}
					multiple
					className="hidden"
					onChange={handleFileChange}
					tabIndex={-1}
				/>
				<input
					ref={imageInputRef}
					type="file"
					accept={IMAGE_ACCEPT}
					multiple
					className="hidden"
					onChange={handleFileChange}
					tabIndex={-1}
				/>

				<UrlAnchorDialog
					open={urlDialogOpen}
					onOpenChange={setUrlDialogOpen}
					onSubmit={(url) => {
						setUrlDialogOpen(false);
						onLinkSubmitted(url);
					}}
				/>
			</>
		);
	},
);
