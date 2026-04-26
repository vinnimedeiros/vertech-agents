"use client";

import { cn } from "@ui/lib";
import type { LucideIcon } from "lucide-react";

export type FloatingTabItem<K extends string = string> = {
	key: K;
	label: string;
	icon?: LucideIcon;
	count?: number;
};

type FloatingTabsProps<K extends string = string> = {
	items: FloatingTabItem<K>[];
	current: K;
	onChange: (key: K) => void;
	className?: string;
};

/**
 * Tabs do setor comercial. Pattern Vinni 2026-04-26:
 *
 *   - Selected = `bg-foreground/8` translúcido sólido SEM linha de contorno.
 *   - Hover inativa = `bg-foreground/5` (preview do estado selected).
 *   - Tipografia Satoshi medium 12.5px.
 *   - Ícone Lucide opcional + count opcional (ex: "4" leads em follow).
 *
 * Pra usar dentro de um header floating, embutir em FloatingHeader
 * passando este componente como `children`.
 */
export function FloatingTabs<K extends string = string>({
	items,
	current,
	onChange,
	className,
}: FloatingTabsProps<K>) {
	return (
		<nav
			className={cn("flex items-center gap-1 overflow-x-auto", className)}
			role="tablist"
		>
			{items.map((item) => {
				const active = item.key === current;
				const Icon = item.icon;
				return (
					<button
						key={item.key}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(item.key)}
						style={{ fontFamily: "var(--font-satoshi)" }}
						className={cn(
							"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] transition-colors duration-150",
							active
								? "bg-foreground/8 font-medium text-foreground"
								: "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
						)}
					>
						{Icon ? <Icon className="size-3.5" /> : null}
						<span>{item.label}</span>
						{typeof item.count === "number" ? (
							<span
								className={cn(
									"ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums",
									active
										? "bg-foreground/15 text-foreground"
										: "bg-foreground/8 text-muted-foreground",
								)}
							>
								{item.count}
							</span>
						) : null}
					</button>
				);
			})}
		</nav>
	);
}
