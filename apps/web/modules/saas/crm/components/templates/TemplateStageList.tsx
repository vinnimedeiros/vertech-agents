"use client";

import { cn } from "@ui/lib";
import type { TemplateStage } from "../../lib/status-templates-data";

/**
 * Preview visual dos stages em ordem: pills coloridas com nome + probability.
 */
export function TemplateStageList({
	stages,
	compact = false,
	className,
}: {
	stages: TemplateStage[];
	compact?: boolean;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-1.5",
				compact ? "text-[9px]" : "text-[10px]",
				className,
			)}
		>
			{stages.map((s, idx) => (
				<div key={`${s.name}-${idx}`} className="flex items-center gap-1">
					<span
						className={cn(
							"inline-flex items-center rounded font-semibold uppercase tracking-wider text-white",
							compact ? "px-1.5 py-0.5" : "px-2 py-1",
						)}
						style={{ backgroundColor: s.color }}
					>
						{s.name}
					</span>
					{!compact && (
						<span className="text-foreground/50">{s.probability}%</span>
					)}
				</div>
			))}
		</div>
	);
}
