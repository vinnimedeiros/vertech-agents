"use client";

import { cn } from "@ui/lib";
import { KanbanSquareIcon, LineChartIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function PipelineViewSwitcher({ basePath }: { basePath: string }) {
	const params = useSearchParams();
	const view = params?.get("view") === "dashboard" ? "dashboard" : "kanban";

	const options = [
		{
			value: "kanban",
			label: "Kanban",
			icon: KanbanSquareIcon,
			href: basePath,
		},
		{
			value: "dashboard",
			label: "Dashboard",
			icon: LineChartIcon,
			href: `${basePath}?view=dashboard`,
		},
	] as const;

	return (
		<div className="inline-flex items-center rounded-md border bg-card p-1">
			{options.map((opt) => {
				const active = view === opt.value;
				const Icon = opt.icon;
				return (
					<Link
						key={opt.value}
						href={opt.href}
						className={cn(
							"flex items-center gap-1.5 rounded px-3 py-1 text-sm transition-colors",
							active
								? "bg-primary text-primary-foreground"
								: "text-foreground/60 hover:text-foreground",
						)}
					>
						<Icon className="size-3.5" />
						{opt.label}
					</Link>
				);
			})}
		</div>
	);
}
