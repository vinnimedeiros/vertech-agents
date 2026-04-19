"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { PlusIcon, XIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

type Props = {
	value: string[];
	onChange: (next: string[]) => void;
	maxItems?: number;
	maxItemLength?: number;
	placeholder?: string;
	addLabel?: string;
	emptyLabel?: string;
	disabled?: boolean;
	className?: string;
};

/**
 * Lista editavel de strings. Add via Enter ou botao "+".
 * Cada item vira chip com X removivel.
 *
 * Reutilizado por:
 * - 07B.5 BusinessTab (inviolableRules)
 * - 07B.6 ConversationTab (qualificationQuestions + handoffTriggers)
 */
export function TagList({
	value,
	onChange,
	maxItems = 20,
	maxItemLength = 200,
	placeholder = "Digite e pressione Enter",
	addLabel = "Adicionar",
	emptyLabel = "Nenhum item adicionado",
	disabled,
	className,
}: Props) {
	const [draft, setDraft] = useState("");

	const limitReached = value.length >= maxItems;

	const commit = () => {
		const trimmed = draft.trim();
		if (!trimmed) return;
		if (trimmed.length > maxItemLength) return;
		if (limitReached) return;
		onChange([...value, trimmed]);
		setDraft("");
	};

	const remove = (index: number) => {
		onChange(value.filter((_, i) => i !== index));
	};

	const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			commit();
		}
	};

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{value.length === 0 ? (
				<p className="text-foreground/50 text-xs italic">{emptyLabel}</p>
			) : (
				<ul className="flex flex-col gap-1.5">
					{value.map((item, idx) => (
						<li
							// eslint-disable-next-line react/no-array-index-key
							key={`${idx}-${item}`}
							className={cn(
								"group flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm",
								"hover:border-primary/30",
							)}
						>
							<span className="flex-1 whitespace-pre-wrap break-words">
								{item}
							</span>
							{!disabled ? (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-6 shrink-0 opacity-60 hover:opacity-100"
									onClick={() => remove(idx)}
									aria-label={`Remover "${item.slice(0, 40)}"`}
								>
									<XIcon className="size-3.5" />
								</Button>
							) : null}
						</li>
					))}
				</ul>
			)}

			{!disabled && !limitReached ? (
				<div className="flex gap-2">
					<Input
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={onKey}
						placeholder={placeholder}
						maxLength={maxItemLength}
						disabled={disabled}
						className="flex-1"
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={commit}
						disabled={disabled || !draft.trim()}
					>
						<PlusIcon className="mr-1 size-4" />
						{addLabel}
					</Button>
				</div>
			) : null}

			{limitReached ? (
				<p className="text-foreground/50 text-xs">
					Limite de {maxItems} items atingido. Remova algum para adicionar mais.
				</p>
			) : null}
		</div>
	);
}
