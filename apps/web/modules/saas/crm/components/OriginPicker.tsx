"use client";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { cn } from "@ui/lib";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	getOriginConfig,
	normalizeOriginSlug,
	ORIGIN_PRESETS,
	type OriginPreset,
} from "../lib/origins";

type OriginPickerProps = {
	value: string | null;
	onChange: (slug: string | null) => void;
	/** Origens custom já usadas em outros leads da org (slug) — pra aparecer como sugestão */
	existingCustom?: string[];
};

export function OriginPicker({
	value,
	onChange,
	existingCustom = [],
}: OriginPickerProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	useEffect(() => {
		if (!open) setQuery("");
	}, [open]);

	const presetSlugs = new Set(ORIGIN_PRESETS.map((p) => p.slug));
	const customOptions: OriginPreset[] = useMemo(
		() =>
			existingCustom
				.filter((s) => !presetSlugs.has(s))
				.map((s) => getOriginConfig(s) as OriginPreset),
		[existingCustom, presetSlugs],
	);

	const allOptions = [...ORIGIN_PRESETS, ...customOptions];

	const q = query.trim().toLowerCase();
	const filtered = q
		? allOptions.filter(
				(o) =>
					o.label.toLowerCase().includes(q) ||
					o.slug.toLowerCase().includes(q),
			)
		: allOptions;

	const normalizedQuery = q ? normalizeOriginSlug(query) : "";
	const canCreate =
		q.length > 0 &&
		normalizedQuery.length > 0 &&
		!allOptions.some(
			(o) =>
				o.label.toLowerCase() === q ||
				o.slug === normalizedQuery,
		);

	function handleSelect(slug: string) {
		onChange(slug);
		setOpen(false);
	}

	function handleCreate(q: string) {
		const normalized = normalizeOriginSlug(q);
		if (!normalized) return;
		onChange(normalized);
		setOpen(false);
	}

	const current = getOriginConfig(value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-1.5 rounded px-1 py-0.5 text-sm hover:bg-muted"
				>
					{current ? (
						<span
							className={cn(
								"inline-flex items-center rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider",
								current.bg,
								current.text,
							)}
						>
							{current.label}
						</span>
					) : (
						<span className="text-foreground/40">—</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-72 p-0" withPortal={false}>
				<div className="border-b p-2">
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Buscar ou criar origem…"
						autoFocus
						className="h-7 w-full rounded bg-transparent px-2 text-sm outline-none placeholder:text-foreground/40"
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								if (canCreate) handleCreate(query);
								else if (filtered.length === 1) handleSelect(filtered[0].slug);
							}
						}}
					/>
				</div>

				<div className="flex flex-wrap gap-1.5 p-3">
					{filtered.length === 0 && !canCreate ? (
						<p className="w-full py-2 text-center text-xs text-muted-foreground">
							Nenhuma origem encontrada
						</p>
					) : (
						filtered.map((o) => {
							const selected = value === o.slug;
							return (
								<button
									key={o.slug}
									type="button"
									onMouseDown={(e) => {
										e.preventDefault();
										handleSelect(o.slug);
									}}
									className={cn(
										"inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 font-semibold text-[11px] uppercase tracking-wider transition-all",
										o.bg,
										o.text,
										selected
											? "ring-2 ring-foreground ring-offset-1 ring-offset-popover"
											: "hover:opacity-80",
									)}
								>
									{o.label}
									{selected && <CheckIcon className="size-3" />}
								</button>
							);
						})
					)}
				</div>

				{canCreate && (
					<button
						type="button"
						onMouseDown={(e) => {
							e.preventDefault();
							handleCreate(query);
						}}
						className="flex w-full cursor-pointer items-center gap-2 border-t px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
					>
						<PlusIcon className="size-3.5 text-muted-foreground" />
						<span>
							Criar <strong className="uppercase">{query}</strong>
						</span>
					</button>
				)}

				{value && (
					<button
						type="button"
						onMouseDown={(e) => {
							e.preventDefault();
							onChange(null);
							setOpen(false);
						}}
						className="flex w-full cursor-pointer items-center gap-2 border-t px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
					>
						<XIcon className="size-3.5" />
						Remover origem
					</button>
				)}
			</PopoverContent>
		</Popover>
	);
}
