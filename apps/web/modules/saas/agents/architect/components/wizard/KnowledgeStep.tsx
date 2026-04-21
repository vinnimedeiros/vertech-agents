"use client";

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import {
	FileIcon,
	FileTextIcon,
	Loader2Icon,
	SkipForwardIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { ArchitectAttachment } from "../../lib/attachment-helpers";
import { AttachmentPendingCard } from "../chat/AttachmentPendingCard";

type Props = {
	sessionId: string;
	organizationSlug: string;
	templateId: string;
	attachments: ArchitectAttachment[];
	uploadFiles: (files: File[]) => Promise<void> | void;
	removeAttachment: (id: string) => void;
	onNext: () => void;
};

/**
 * Step 3 do wizard (Conhecimento).
 *
 * Upload opcional de arquivos pra base de conhecimento do agente OU pula.
 * Reuso do pipeline existente (useFileUpload + AttachmentPendingCard).
 */
export function KnowledgeStep({
	attachments,
	uploadFiles,
	removeAttachment,
	onNext,
}: Props) {
	const [mode, setMode] = useState<"choose" | "upload" | "skip">("choose");
	const inputRef = useRef<HTMLInputElement>(null);
	const hasUploading = attachments.some((a) => a.status === "uploading");

	const handlePickFile = () => {
		inputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if (files.length > 0) {
			void uploadFiles(files);
		}
		e.target.value = "";
	};

	return (
		<div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-6 md:px-6">
			<header>
				<h1 className="font-semibold text-2xl text-foreground">
					Base de conhecimento
				</h1>
				<p className="mt-1 text-foreground/60 text-sm">
					Uma base ajuda o agente a responder com informações
					específicas do seu negócio. Opcional — pode adicionar depois.
				</p>
			</header>

			{mode === "choose" ? (
				<div className="grid gap-3 md:grid-cols-2">
					<OptionCard
						icon={<FileIcon className="size-6 text-primary" />}
						title="Tenho arquivos"
						description="CSV, PDF, DOCX, XLSX ou TXT com informações do seu negócio."
						onClick={() => setMode("upload")}
					/>
					<OptionCard
						icon={
							<SkipForwardIcon className="size-6 text-foreground/60" />
						}
						title="Vou adicionar depois"
						description="Crie o agente agora e adicione conhecimento no painel depois."
						onClick={() => setMode("skip")}
					/>
				</div>
			) : null}

			{mode === "upload" ? (
				<section className="space-y-4">
					<div
						onClick={handlePickFile}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								handlePickFile();
							}
						}}
						role="button"
						tabIndex={0}
						className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border border-dashed bg-muted/30 p-10 transition-colors hover:border-primary/40 hover:bg-primary/5"
					>
						<FileTextIcon className="size-8 text-foreground/40" />
						<p className="font-medium text-foreground">
							Clique pra escolher arquivos
						</p>
						<p className="text-foreground/60 text-xs">
							PDF, DOCX, CSV, XLSX, TXT (até 10MB cada, max 5
							arquivos)
						</p>
					</div>
					<input
						ref={inputRef}
						type="file"
						accept=".pdf,.docx,.csv,.xlsx,.txt"
						multiple
						className="hidden"
						onChange={handleFileChange}
					/>

					{attachments.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{attachments.map((att) => (
								<AttachmentPendingCard
									key={att.id}
									attachment={att}
									onRemove={removeAttachment}
								/>
							))}
						</div>
					) : null}
				</section>
			) : null}

			{mode === "skip" ? (
				<section className="rounded-xl border border-border bg-muted/30 p-6 text-center">
					<p className="text-foreground/80 text-sm">
						Tudo certo. O agente será criado sem base de conhecimento
						específica. Você pode adicionar arquivos depois no
						painel do agente.
					</p>
				</section>
			) : null}

			<footer className="flex justify-between gap-2 pt-2">
				{mode !== "choose" ? (
					<Button
						variant="ghost"
						onClick={() => setMode("choose")}
						disabled={hasUploading}
					>
						Voltar
					</Button>
				) : (
					<div />
				)}
				{mode !== "choose" ? (
					<Button
						onClick={onNext}
						disabled={hasUploading}
						className="gap-1.5"
					>
						{hasUploading ? (
							<>
								<Loader2Icon className="size-4 animate-spin" />
								Processando...
							</>
						) : (
							"Próximo"
						)}
					</Button>
				) : null}
			</footer>
		</div>
	);
}

function OptionCard({
	icon,
	title,
	description,
	onClick,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left transition-all",
				"hover:border-primary/50 hover:shadow-md",
			)}
		>
			{icon}
			<div>
				<h3 className="font-semibold text-foreground">{title}</h3>
				<p className="mt-1 text-foreground/60 text-sm">
					{description}
				</p>
			</div>
		</button>
	);
}
