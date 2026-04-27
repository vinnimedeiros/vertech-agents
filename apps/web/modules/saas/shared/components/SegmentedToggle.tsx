"use client";

import { cn } from "@ui/lib";
import type { LucideIcon } from "lucide-react";

export type SegmentedToggleItem<K extends string = string> = {
	key: K;
	label: string;
	icon?: LucideIcon;
};

type Props<K extends string = string> = {
	items: SegmentedToggleItem<K>[];
	current: K;
	onChange: (key: K) => void;
	disabled?: boolean;
	className?: string;
};

/**
 * Toggle padrão sistema — pattern Vinni 2026-04-26 noite.
 *
 * Track bg-foreground/5 rounded-md p-0.5. Item ativo bg-background shadow-sm.
 * Item inativo text-foreground/55 hover:text-foreground.
 *
 * Tamanho contido: h-7 px-2.5 text-[11.5px]. Aplicar em:
 *   - Period filter (Hoje / 7d / 30d / Mês)
 *   - Pipeline view mode (Quadro / Painel)
 *   - Outras escolhas binárias/ternárias
 */
export function SegmentedToggle<K extends string = string>({
	items,
	current,
	onChange,
	disabled,
	className,
}: Props<K>) {
	return (
		<div
			className={cn(
				"inline-flex items-center gap-0.5 rounded-md bg-foreground/5 p-0.5",
				className,
			)}
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
						disabled={disabled}
						className={cn(
							"inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[11.5px] font-medium transition-colors",
							"disabled:cursor-not-allowed disabled:opacity-50",
							active
								? "bg-background text-foreground shadow-sm"
								: "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
						)}
					>
						{Icon ? <Icon className="size-3.5" /> : null}
						<span>{item.label}</span>
					</button>
				);
			})}
		</div>
	);
}
