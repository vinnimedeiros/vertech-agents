"use client";

import { FileTextIcon } from "lucide-react";
import type { KnowledgeBaseContent } from "../../../lib/artifact-types";

type Props = { content: KnowledgeBaseContent };

export function KnowledgeBaseRenderer({ content }: Props) {
	return (
		<div className="space-y-3 text-sm">
			<section>
				<h4 className="mb-1.5 font-medium text-foreground/60 text-xs uppercase tracking-wide">
					Documentos ({content.documents.length})
				</h4>
				{content.documents.length === 0 ? (
					<p className="text-foreground/60 text-xs italic">
						Nenhum documento anexado.
					</p>
				) : (
					<ul className="space-y-1.5">
						{content.documents.map((d) => (
							<li
								key={d.id}
								className="flex items-center gap-2 rounded border border-border bg-muted/40 px-2.5 py-1.5 text-xs"
							>
								<FileTextIcon className="size-3.5 text-foreground/60" />
								<span className="flex-1 truncate font-medium text-foreground">
									{d.title || "Documento sem título"}
								</span>
								{typeof d.chunkCount === "number" ? (
									<span className="text-foreground/50">
										{d.chunkCount} chunks
									</span>
								) : null}
							</li>
						))}
					</ul>
				)}
			</section>

			{content.additionalNotes ? (
				<section>
					<h4 className="mb-1 font-medium text-foreground/60 text-xs uppercase tracking-wide">
						Notas adicionais
					</h4>
					<p className="whitespace-pre-wrap text-foreground/80 text-xs leading-relaxed">
						{content.additionalNotes}
					</p>
				</section>
			) : null}

			{content.domainAnswers &&
			Object.keys(content.domainAnswers).length > 0 ? (
				<section>
					<h4 className="mb-1.5 font-medium text-foreground/60 text-xs uppercase tracking-wide">
						Perguntas de domínio
					</h4>
					<dl className="space-y-1.5">
						{Object.entries(content.domainAnswers).map(
							([question, answer]) => (
								<div key={question}>
									<dt className="font-medium text-foreground/70 text-xs">
										{question}
									</dt>
									<dd className="text-foreground/60 text-xs">
										{answer}
									</dd>
								</div>
							),
						)}
					</dl>
				</section>
			) : null}
		</div>
	);
}
