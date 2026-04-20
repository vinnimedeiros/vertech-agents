"use client";

import { cn } from "@ui/lib";
import { SparklesIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
	children?: ReactNode;
	isLoadingInitial?: boolean;
};

/**
 * Container de mensagens do chat do Arquiteto (story 09.2, zona 3).
 *
 * Layout (AC15-16):
 * - `max-w-[800px] mx-auto px-6` centralizado
 * - `flex-1` ocupa espaco entre status-bar e composer
 * - Scroll vertical suave
 * - `pb-12` pra ultima msg nao ficar colada no composer
 *
 * Placeholder (AC17): shimmer "Arquiteto está preparando..." quando
 * `isLoadingInitial` e nao ha children. Story 09.5 injeta mensagens reais.
 */
export function MessagesArea({ children, isLoadingInitial = true }: Props) {
	const isEmpty = !children;

	return (
		<div
			className={cn(
				"flex-1 overflow-y-auto scroll-smooth",
				"bg-background",
			)}
		>
			<div className="mx-auto flex min-h-full max-w-[800px] flex-col gap-4 px-4 pt-6 pb-32 md:px-6">
				{isEmpty && isLoadingInitial ? <InitialShimmer /> : children}
			</div>
		</div>
	);
}

function InitialShimmer() {
	return (
		<div className="flex flex-col items-start gap-3">
			<div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
				<SparklesIcon className="size-4 text-primary" />
			</div>
			<div className="flex flex-col gap-2">
				<div className="h-4 w-48 animate-pulse rounded-md bg-foreground/10" />
				<div className="h-4 w-64 animate-pulse rounded-md bg-foreground/10" />
				<div className="h-4 w-32 animate-pulse rounded-md bg-foreground/10" />
			</div>
			<p className="text-foreground/50 text-xs italic">
				Arquiteto está preparando a primeira pergunta…
			</p>
		</div>
	);
}
