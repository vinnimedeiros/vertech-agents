"use client";

import { Button } from "@ui/components/button";
import { Calendar } from "@ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { cn } from "@ui/lib";
import { CalendarIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

type Props = {
	value: DateRange | undefined;
	onChange: (range: DateRange | undefined) => void;
	className?: string;
};

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "short",
});

/**
 * Botão quadrado h-7 w-7 com ícone calendário. Abre Popover com Calendar
 * mode="range" + footer Cancelar/Aplicar. Popover fica travado até user
 * clicar Aplicar (commit do range) ou Cancelar (descarta draft).
 *
 * Limpar range via X no chip ao lado dispara onChange(undefined) direto.
 */
export function DateRangePickerButton({
	value,
	onChange,
	className,
}: Props) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<DateRange | undefined>(value);

	// Reset draft pra value atual sempre que popover abre
	useEffect(() => {
		if (open) {
			setDraft(value);
		}
	}, [open, value]);

	const hasRange = value?.from && value?.to;
	const draftComplete = Boolean(draft?.from && draft?.to);

	function clear(e: React.MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		setDraft(undefined);
		onChange(undefined);
	}

	function handleApply() {
		if (!draftComplete) return;
		onChange(draft);
		setOpen(false);
	}

	function handleCancel() {
		setDraft(value);
		setOpen(false);
	}

	return (
		<div className={cn("inline-flex items-center gap-1", className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="h-7 w-7 shrink-0"
						title="Período personalizado"
						aria-label="Período personalizado"
					>
						<CalendarIcon className="size-3.5" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-auto p-0"
					align="end"
					sideOffset={6}
					onInteractOutside={(e) => {
						// Bloqueia auto-close ao clicar fora durante seleção parcial
						if (draft?.from && !draft?.to) {
							e.preventDefault();
						}
					}}
				>
					<Calendar
						mode="range"
						defaultMonth={draft?.from ?? new Date()}
						selected={draft}
						onSelect={setDraft}
						numberOfMonths={2}
						showOutsideDays={false}
						captionLayout="dropdown"
						startMonth={
							new Date(new Date().getFullYear() - 5, 0, 1)
						}
						endMonth={
							new Date(new Date().getFullYear() + 2, 11, 31)
						}
						initialFocus
					/>
					<div className="flex items-center justify-between gap-2 border-t border-border/40 px-3 py-2">
						<span className="text-[11.5px] text-foreground/55 tabular-nums">
							{draft?.from && draft?.to ? (
								<>
									{DATE_FMT.format(draft.from)} –{" "}
									{DATE_FMT.format(draft.to)}
								</>
							) : draft?.from ? (
								<>{DATE_FMT.format(draft.from)} – ...</>
							) : (
								"Selecione data inicial e final"
							)}
						</span>
						<div className="flex items-center gap-1.5">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleCancel}
								className="h-7 px-2.5 text-[11.5px]"
							>
								Cancelar
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={handleApply}
								disabled={!draftComplete}
								className="h-7 px-3 text-[11.5px]"
							>
								Aplicar
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>

			{hasRange ? (
				<button
					type="button"
					onClick={clear}
					className="inline-flex h-7 items-center gap-1.5 rounded-md bg-foreground/5 px-2 text-[11.5px] font-medium text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
					title="Limpar período"
				>
					<span>
						{DATE_FMT.format(value.from!)} – {DATE_FMT.format(value.to!)}
					</span>
					<XIcon className="size-3" />
				</button>
			) : null}
		</div>
	);
}
