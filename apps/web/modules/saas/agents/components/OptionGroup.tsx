"use client";

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";

type Option<T extends string> = {
	value: T;
	label: string;
};

type Props<T extends string> = {
	value: T | undefined;
	onChange: (value: T) => void;
	options: readonly Option<T>[];
	ariaLabel: string;
	disabled?: boolean;
	className?: string;
};

/**
 * Grupo de botoes tipo radio — pattern reutilizado entre as abas do
 * detalhe do agente pra campos enum (genero, tom, formalidade etc).
 *
 * Acessibilidade: implementa role=radiogroup no wrapper e role=radio +
 * aria-checked em cada botao.
 */
export function OptionGroup<T extends string>({
	value,
	onChange,
	options,
	ariaLabel,
	disabled,
	className,
}: Props<T>) {
	return (
		<div
			className={cn("flex flex-wrap gap-2", className)}
			role="radiogroup"
			aria-label={ariaLabel}
		>
			{options.map((opt) => {
				const selected = value === opt.value;
				return (
					<Button
						key={opt.value}
						type="button"
						variant={selected ? "primary" : "outline"}
						size="sm"
						role="radio"
						aria-checked={selected}
						disabled={disabled}
						onClick={() => onChange(opt.value)}
						className={cn(
							"min-w-28",
							selected && "ring-2 ring-primary/40",
						)}
					>
						{opt.label}
					</Button>
				);
			})}
		</div>
	);
}
