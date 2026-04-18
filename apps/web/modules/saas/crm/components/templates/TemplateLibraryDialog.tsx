"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { useState } from "react";
import type { StatusTemplateRow } from "../../lib/server";
import { TemplateCard } from "./TemplateCard";
import { TemplatePreviewModal } from "./TemplatePreviewModal";

type TemplateLibraryDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	organizationSlug: string;
	templates: StatusTemplateRow[];
	onPipelineCreated?: (pipelineId: string) => void;
};

export function TemplateLibraryDialog({
	open,
	onOpenChange,
	organizationId,
	organizationSlug,
	templates,
	onPipelineCreated,
}: TemplateLibraryDialogProps) {
	const [selectedTemplate, setSelectedTemplate] =
		useState<StatusTemplateRow | null>(null);

	const builtIn = templates.filter((t) => t.isBuiltIn);
	const custom = templates.filter((t) => !t.isBuiltIn);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className="flex max-h-[85vh] w-[95vw] max-w-[1000px] flex-col gap-0 overflow-hidden p-0"
					onInteractOutside={(e) => {
						const target = e.target as HTMLElement | null;
						if (
							target?.closest(
								"[data-radix-popper-content-wrapper],[role='dialog'] [role='dialog']",
							)
						)
							e.preventDefault();
					}}
				>
					<DialogHeader className="border-b px-6 py-4">
						<DialogTitle>Escolha um ponto de partida</DialogTitle>
						<DialogDescription>
							Aplique um dos modelos prontos ou comece do zero.
						</DialogDescription>
					</DialogHeader>

					<div className="min-h-0 flex-1 overflow-y-auto p-6">
						{builtIn.length > 0 && (
							<section className="space-y-3">
								<h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
									Modelos prontos
								</h4>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{builtIn.map((t) => (
										<TemplateCard
											key={t.id}
											template={t}
											onClick={() => setSelectedTemplate(t)}
										/>
									))}
								</div>
							</section>
						)}

						{custom.length > 0 && (
							<section className="mt-8 space-y-3">
								<h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
									Seus templates salvos
								</h4>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{custom.map((t) => (
										<TemplateCard
											key={t.id}
											template={t}
											onClick={() => setSelectedTemplate(t)}
										/>
									))}
								</div>
							</section>
						)}

						{templates.length === 0 && (
							<p className="py-8 text-center text-sm text-muted-foreground">
								Nenhum template disponível ainda.
							</p>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{selectedTemplate && (
				<TemplatePreviewModal
					open={selectedTemplate !== null}
					onOpenChange={(o) => {
						if (!o) setSelectedTemplate(null);
					}}
					template={selectedTemplate}
					organizationId={organizationId}
					organizationSlug={organizationSlug}
					onApplied={(pipelineId) => {
						setSelectedTemplate(null);
						onOpenChange(false);
						onPipelineCreated?.(pipelineId);
					}}
				/>
			)}
		</>
	);
}
