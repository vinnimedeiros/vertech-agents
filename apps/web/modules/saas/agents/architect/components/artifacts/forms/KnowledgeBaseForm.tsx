"use client";

import { Button } from "@ui/components/button";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib";
import { FileTextIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import type { KnowledgeBaseContent } from "../../../lib/artifact-types";
import {
	type KnowledgeBaseRefineInput,
	knowledgeBaseRefineSchema,
} from "../../../lib/inline-refinement-schemas";

type Props = {
	initial: KnowledgeBaseContent;
	isSaving: boolean;
	onSave: (data: KnowledgeBaseRefineInput) => Promise<void> | void;
	onCancel: () => void;
};

export function KnowledgeBaseForm({
	initial,
	isSaving,
	onSave,
	onCancel,
}: Props) {
	const [additionalNotes, setAdditionalNotes] = useState(
		initial.additionalNotes ?? "",
	);
	const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
	const [errors, setErrors] = useState<Record<string, string>>({});

	const toggleRemove = (id: string) => {
		setRemovedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleSubmit = async () => {
		const parsed = knowledgeBaseRefineSchema.safeParse({
			additionalNotes: additionalNotes.trim() || undefined,
			removedDocumentIds: Array.from(removedIds),
		});
		if (!parsed.success) {
			const next: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				next[issue.path.join(".")] = issue.message;
			}
			setErrors(next);
			return;
		}
		setErrors({});
		await onSave(parsed.data);
	};

	return (
		<div className="space-y-4 text-sm">
			<section>
				<h4 className="mb-2 font-medium text-foreground/70 text-xs uppercase tracking-wide">
					Documentos ({initial.documents.length})
				</h4>
				{initial.documents.length === 0 ? (
					<p className="rounded border border-border border-dashed px-3 py-4 text-center text-foreground/60 text-xs italic">
						Anexe documentos pelo composer. Eles aparecem aqui quando
						indexados.
					</p>
				) : (
					<ul className="space-y-1.5">
						{initial.documents.map((d) => {
							const markedForRemoval = removedIds.has(d.id);
							return (
								<li
									key={d.id}
									className={cn(
										"flex items-center gap-2 rounded border border-border bg-muted/40 px-2.5 py-1.5 text-xs transition-opacity",
										markedForRemoval &&
											"line-through opacity-60",
									)}
								>
									<FileTextIcon className="size-3.5 text-foreground/60" />
									<span className="flex-1 truncate font-medium text-foreground">
										{d.title || "Documento sem título"}
									</span>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => toggleRemove(d.id)}
										disabled={isSaving}
										aria-label={
											markedForRemoval
												? `Restaurar ${d.title}`
												: `Remover ${d.title}`
										}
										className={cn(
											"size-6",
											markedForRemoval
												? "text-primary hover:text-primary"
												: "text-destructive/70 hover:text-destructive",
										)}
									>
										<Trash2Icon className="size-3" />
									</Button>
								</li>
							);
						})}
					</ul>
				)}
				{removedIds.size > 0 ? (
					<p className="mt-2 text-destructive text-xs">
						{removedIds.size} documento(s) será(ão) removido(s) ao
						salvar.
					</p>
				) : null}
			</section>

			<div>
				<div className="mb-1 flex items-center justify-between">
					<label className="font-medium text-foreground/70 text-xs uppercase tracking-wide">
						Notas adicionais
					</label>
					<span className="text-foreground/50 text-xs">
						{additionalNotes.length}/1000
					</span>
				</div>
				<Textarea
					rows={4}
					value={additionalNotes}
					onChange={(e) =>
						setAdditionalNotes(e.target.value.slice(0, 1000))
					}
					placeholder="Informações extra que o Arquiteto não colheu via chat ou documentos..."
					disabled={isSaving}
				/>
				{errors.additionalNotes ? (
					<p className="mt-1 text-destructive text-xs">
						{errors.additionalNotes}
					</p>
				) : null}
			</div>

			<div className="flex items-center justify-end gap-2 pt-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={onCancel}
					disabled={isSaving}
				>
					Cancelar
				</Button>
				<Button
					size="sm"
					onClick={handleSubmit}
					disabled={isSaving}
					className="gap-1.5"
				>
					{isSaving ? (
						<>
							<Loader2Icon className="size-3.5 animate-spin" />
							Salvando...
						</>
					) : (
						"Salvar alterações"
					)}
				</Button>
			</div>
		</div>
	);
}
