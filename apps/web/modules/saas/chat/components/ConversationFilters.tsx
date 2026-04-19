"use client";

import {
	STATUS_FILTERS,
	type StatusFilterKey,
} from "@saas/chat/lib/status-config";
import { cn } from "@ui/lib";

type Props = {
	active: StatusFilterKey;
	counts: Record<StatusFilterKey, number>;
	onChange: (key: StatusFilterKey) => void;
};

export function ConversationFilters({ active, counts, onChange }: Props) {
	return (
		<div className="flex items-center gap-1">
			{STATUS_FILTERS.map((f) => {
				const isActive = f.key === active;
				const count = counts[f.key] ?? 0;
				return (
					<button
						key={f.key}
						type="button"
						onClick={() => onChange(f.key)}
						className={cn(
							"inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors",
							"focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
							isActive
								? "bg-primary/15 text-foreground font-medium"
								: "text-foreground/65 hover:bg-foreground/5",
						)}
					>
						<span className={cn("size-1.5 shrink-0 rounded-full", f.dotClass)} />
						<span className="truncate">{f.label}</span>
						<span
							className={cn(
								"tabular-nums text-[10px]",
								isActive ? "text-foreground/70" : "text-foreground/45",
							)}
						>
							{count}
						</span>
					</button>
				);
			})}
		</div>
	);
}
