"use client";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { cn } from "@ui/lib";
import { PlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	getInterestColor,
	normalizeInterest,
} from "../lib/interest-colors";

type InterestsPickerProps = {
	value: string[];
	onChange: (next: string[]) => void;
	/** Interesses já existentes na org (pra sugestões do autocomplete) */
	suggestions?: string[];
};

export function InterestsPicker({
	value,
	onChange,
	suggestions = [],
}: InterestsPickerProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	useEffect(() => {
		if (!open) setQuery("");
	}, [open]);

	// Sugestões disponíveis (remove as que já estão selecionadas)
	const availableSuggestions = useMemo(
		() =>
			suggestions.filter(
				(s) =>
					!value.some(
						(v) => v.toLocaleLowerCase() === s.toLocaleLowerCase(),
					),
			),
		[suggestions, value],
	);

	const q = query.trim();
	const filtered = q
		? availableSuggestions.filter((s) =>
				s.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
			)
		: availableSuggestions;

	const canCreate =
		q.length > 0 &&
		!value.some((v) => v.toLocaleLowerCase() === q.toLocaleLowerCase()) &&
		!suggestions.some(
			(s) => s.toLocaleLowerCase() === q.toLocaleLowerCase(),
		);

	function addInterest(raw: string) {
		const normalized = normalizeInterest(raw);
		if (!normalized) return;
		if (value.some((v) => v.toLocaleLowerCase() === normalized.toLocaleLowerCase()))
			return;
		onChange([...value, normalized]);
		setQuery("");
	}

	function removeInterest(idx: number) {
		const next = value.filter((_, i) => i !== idx);
		onChange(next);
	}

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{value.map((interest, idx) => {
				const color = getInterestColor(interest);
				return (
					<span
						key={`${interest}-${idx}`}
						className={cn(
							"group inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold text-[11px] uppercase tracking-wider",
							color.bg,
							color.text,
						)}
					>
						{interest}
						<button
							type="button"
							onClick={() => removeInterest(idx)}
							className="flex size-3 items-center justify-center rounded-full opacity-60 hover:bg-black/20 hover:opacity-100"
							aria-label={`Remover ${interest}`}
						>
							<XIcon className="size-2.5" />
						</button>
					</span>
				);
			})}

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className={cn(
							"flex h-6 items-center gap-1 rounded px-2 text-[11px] transition-colors",
							value.length === 0
								? "border border-dashed border-border text-foreground/50 hover:border-foreground/30 hover:text-foreground"
								: "text-foreground/50 hover:bg-muted hover:text-foreground",
						)}
					>
						<PlusIcon className="size-3" />
						{value.length === 0 ? "Adicionar" : ""}
					</button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-72 p-0">
					<div className="border-b p-2">
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Buscar ou criar interesse…"
							autoFocus
							className="h-7 w-full rounded bg-transparent px-2 text-sm outline-none placeholder:text-foreground/40"
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									if (canCreate) {
										addInterest(q);
									} else if (filtered.length === 1) {
										addInterest(filtered[0]);
									}
								}
							}}
						/>
					</div>

					<div className="max-h-60 overflow-y-auto p-1">
						{filtered.length === 0 && !canCreate ? (
							<p className="py-4 text-center text-xs text-muted-foreground">
								{availableSuggestions.length === 0
									? "Nenhum interesse cadastrado ainda"
									: "Nada corresponde"}
							</p>
						) : (
							<>
								{filtered.map((s) => {
									const color = getInterestColor(s);
									return (
										<button
											key={s}
											type="button"
											onMouseDown={(e) => {
												e.preventDefault();
												addInterest(s);
											}}
											className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted"
										>
											<span
												className={cn(
													"inline-flex items-center rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider",
													color.bg,
													color.text,
												)}
											>
												{s}
											</span>
										</button>
									);
								})}
							</>
						)}
					</div>

					{canCreate && (
						<button
							type="button"
							onMouseDown={(e) => {
								e.preventDefault();
								addInterest(q);
							}}
							className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
						>
							<PlusIcon className="size-3.5 text-muted-foreground" />
							<span>
								Criar <strong>{q}</strong>
							</span>
						</button>
					)}
				</PopoverContent>
			</Popover>
		</div>
	);
}
