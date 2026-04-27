"use client";

import { buttonVariants } from "@ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { cn } from "@ui/lib";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChangeEvent } from "react";
import { DayPicker, type DropdownProps } from "react-day-picker";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Wrapper shadcn (react-day-picker v9). Estilo neutro preto/branco.
 * pt-BR. Dropdowns mês/ano custom (Select shadcn) — substitui `<select>`
 * HTML nativo. Match shadcn/ui oficial.
 */
export function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			locale={ptBR}
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={{
				months:
					"flex flex-col gap-4 sm:flex-row sm:gap-6 sm:space-y-0 relative",
				month: "flex flex-col gap-4",
				month_caption:
					"flex justify-center pt-1 relative items-center w-full h-7",
				caption_label: "text-sm font-medium text-foreground capitalize",
				dropdowns: "flex items-center justify-center gap-1.5",
				nav: "flex items-center gap-1",
				button_previous: cn(
					buttonVariants({ variant: "ghost" }),
					"size-7 p-0 text-foreground/70 hover:text-foreground hover:bg-foreground/5 absolute left-1 top-0",
				),
				button_next: cn(
					buttonVariants({ variant: "ghost" }),
					"size-7 p-0 text-foreground/70 hover:text-foreground hover:bg-foreground/5 absolute right-1 top-0",
				),
				month_grid: "w-full border-collapse",
				weekdays: "flex",
				weekday:
					"text-muted-foreground w-9 font-normal text-[0.75rem] capitalize",
				week: "flex w-full mt-1",
				day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
				day_button: cn(
					"inline-flex size-9 items-center justify-center p-0",
					"text-sm font-normal text-foreground",
					"hover:bg-foreground/10 hover:rounded-md",
					"focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:rounded-md",
					"aria-selected:opacity-100 disabled:pointer-events-none disabled:opacity-40",
				),
				range_start:
					"day-range-start [&>button]:bg-foreground [&>button]:text-background [&>button]:hover:bg-foreground [&>button]:hover:text-background [&>button]:rounded-l-md [&>button]:rounded-r-none",
				range_end:
					"day-range-end [&>button]:bg-foreground [&>button]:text-background [&>button]:hover:bg-foreground [&>button]:hover:text-background [&>button]:rounded-r-md [&>button]:rounded-l-none",
				range_middle:
					"[&>button]:bg-foreground/10 [&>button]:text-foreground [&>button]:hover:bg-foreground/15 [&>button]:rounded-none",
				selected:
					"[&>button]:bg-foreground [&>button]:text-background [&>button]:hover:bg-foreground [&>button]:hover:text-background [&>button]:rounded-md",
				today:
					"[&>button]:ring-1 [&>button]:ring-foreground/20 [&>button]:rounded-md",
				outside:
					"day-outside [&>button]:text-muted-foreground/60",
				disabled: "[&>button]:text-muted-foreground/40 [&>button]:opacity-40",
				hidden: "invisible",
				...classNames,
			}}
			components={{
				Chevron: ({ orientation }) =>
					orientation === "left" ? (
						<ChevronLeft className="size-4" />
					) : (
						<ChevronRight className="size-4" />
					),
				MonthsDropdown: CalendarDropdown,
				YearsDropdown: CalendarDropdown,
			}}
			{...props}
		/>
	);
}

/**
 * Dropdown custom shadcn substituindo `<select>` HTML nativo do
 * react-day-picker. Mantém API esperada (onChange ChangeEvent).
 */
function CalendarDropdown({
	value,
	onChange,
	options,
	"aria-label": ariaLabel,
}: DropdownProps) {
	const stringValue = String(value);

	if (!options || options.length === 0) {
		return <span />;
	}

	function handleValueChange(next: string) {
		const synthetic = {
			target: { value: next },
			currentTarget: { value: next },
		} as ChangeEvent<HTMLSelectElement>;
		onChange?.(synthetic);
	}

	return (
		<Select value={stringValue} onValueChange={handleValueChange}>
			<SelectTrigger
				className={cn(
					"h-7 w-fit gap-1 border-0 bg-transparent px-2 text-sm font-medium text-foreground",
					"shadow-none ring-0 focus:ring-0 focus:ring-offset-0",
					"hover:bg-foreground/5 capitalize",
					"[&>svg]:size-3.5 [&>svg]:opacity-60",
				)}
				aria-label={ariaLabel}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent
				position="popper"
				className="max-h-[260px] min-w-[8rem]"
			>
				{options.map((opt) => (
					<SelectItem
						key={opt.value}
						value={String(opt.value)}
						disabled={opt.disabled}
						className="capitalize"
					>
						{opt.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
