"use client";

import { cn } from "@ui/lib";
import {
	KanbanSquareIcon,
	LineChartIcon,
	TableIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ViewMode } from "../lib/view-filters";

export function PipelineViewSwitcher({
	basePath,
	activeMode,
}: {
	basePath: string;
	activeMode: ViewMode;
}) {
	const router = useRouter();
	const searchParams = useSearchParams();

	function navigateTo(mode: ViewMode) {
		const p = new URLSearchParams(searchParams?.toString() ?? "");
		if (mode === "kanban") {
			p.delete("view");
		} else {
			p.set("view", mode);
		}
		const qs = p.toString();
		router.push(qs ? `${basePath}?${qs}` : basePath);
	}

	const options = [
		{ value: "kanban" as const, label: "Kanban", icon: KanbanSquareIcon },
		{ value: "list" as const, label: "Lista", icon: TableIcon },
		{ value: "dashboard" as const, label: "Dashboard", icon: LineChartIcon },
	];

	return (
		<div className="inline-flex items-center rounded-md border bg-card p-1">
			{options.map((opt) => {
				const active = activeMode === opt.value;
				const Icon = opt.icon;
				return (
					<button
						key={opt.value}
						type="button"
						onClick={() => navigateTo(opt.value)}
						className={cn(
							"flex items-center gap-1.5 rounded px-3 py-1 text-sm transition-colors",
							active
								? "bg-primary text-primary-foreground"
								: "text-foreground/60 hover:text-foreground",
						)}
					>
						<Icon className="size-3.5" />
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}
