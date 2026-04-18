"use client";

import { cn } from "@ui/lib";
import type { StatusTemplateRow } from "../../lib/server";
import { TemplateStageList } from "./TemplateStageList";
import { TemplateVerticalIcon } from "./TemplateVerticalIcon";

type TemplateCardProps = {
	template: StatusTemplateRow;
	onClick: () => void;
};

export function TemplateCard({ template, onClick }: TemplateCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all",
				"hover:border-primary/50 hover:shadow-md",
			)}
		>
			<div className="flex w-full items-start justify-between">
				<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20">
					<TemplateVerticalIcon
						iconKey={template.metadata?.iconKey}
						className="size-5"
					/>
				</div>
				{template.isBuiltIn ? (
					<span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground/60">
						Built-in
					</span>
				) : (
					<span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground/60">
						Seu
					</span>
				)}
			</div>

			<div className="flex-1">
				<h3 className="font-semibold text-foreground text-sm">
					{template.name}
				</h3>
				{template.description && (
					<p className="mt-1 line-clamp-2 text-foreground/60 text-xs">
						{template.description}
					</p>
				)}
			</div>

			<div className="w-full">
				<p className="mb-1.5 text-[10px] uppercase tracking-wider text-foreground/40">
					{template.stages.length} etapas
				</p>
				<TemplateStageList stages={template.stages} compact />
			</div>
		</button>
	);
}
