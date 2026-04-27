"use client";

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { Loader2Icon } from "lucide-react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

type Props<TValues extends FieldValues> = {
	form: UseFormReturn<TValues>;
	onSubmit: () => void;
	onDiscard: () => void;
	isSubmitting: boolean;
	className?: string;
};

export function DirtyStateBanner<TValues extends FieldValues>({
	form,
	onSubmit,
	onDiscard,
	isSubmitting,
	className,
}: Props<TValues>) {
	const dirtyCount = Object.keys(form.formState.dirtyFields).length;
	const isDirty = form.formState.isDirty && dirtyCount > 0;

	if (!isDirty) return null;

	const label =
		dirtyCount === 1
			? "1 mudança não salva"
			: `${dirtyCount} mudanças não salvas`;

	return (
		<div
			className={cn(
				"sticky bottom-0 z-10 flex items-center justify-between gap-4 border-primary/20 border-t-2 bg-card px-4 py-3 shadow-lg",
				"sm:rounded-b-lg sm:px-6",
				className,
			)}
			role="region"
			aria-label="Mudanças não salvas"
		>
			<div className="flex items-center gap-2 text-foreground/80 text-sm">
				<span
					className="inline-block size-2 animate-pulse rounded-full bg-primary"
					aria-hidden="true"
				/>
				<span>{label}</span>
			</div>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onDiscard}
					disabled={isSubmitting}
				>
					Descartar
				</Button>
				<Button
					type="button"
					size="sm"
					onClick={onSubmit}
					disabled={isSubmitting}
				>
					{isSubmitting ? (
						<>
							<Loader2Icon className="mr-2 size-4 animate-spin" />
							Salvando...
						</>
					) : (
						"Salvar"
					)}
				</Button>
			</div>
		</div>
	);
}
