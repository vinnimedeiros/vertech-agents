"use client";

import { cn } from "@ui/lib";
import { CheckIcon } from "lucide-react";

export type ArchitectStage = "ideation" | "planning" | "knowledge" | "creation";

const STAGES: { id: ArchitectStage; label: string }[] = [
	{ id: "ideation", label: "Ideação" },
	{ id: "planning", label: "Planejamento" },
	{ id: "knowledge", label: "Conhecimento" },
	{ id: "creation", label: "Criação" },
];

type Props = {
	currentStage: ArchitectStage;
	doneStages?: ArchitectStage[];
};

/**
 * Status-bar fino do chat do Arquiteto (story 09.2, zona 2).
 *
 * Mostra as 4 etapas do fluxo. Estados por etapa:
 * - done (check verde)
 * - active (dot preenchido primary + label font-medium primary)
 * - pending (dot oco muted)
 *
 * Responsivo (AC13): em mobile mostra apenas etapa atual com "(n/4)".
 * Acessibilidade (AC14): `role="status"` + `aria-live="polite"` anuncia mudancas
 * quando o Agent Arquiteto avanca etapa (via update de prop currentStage).
 */
export function StatusBar({ currentStage, doneStages = [] }: Props) {
	const currentIdx = STAGES.findIndex((s) => s.id === currentStage);
	const currentStage_safe = currentIdx >= 0 ? STAGES[currentIdx] : STAGES[0];
	if (!currentStage_safe) return null;

	const doneSet = new Set(doneStages);

	return (
		<output
			aria-live="polite"
			className="flex h-7 items-center border-border border-b bg-background/50 px-6 text-xs"
		>
			{/* Mobile: mostra so current stage com (n/4) */}
			<div className="flex items-center gap-2 md:hidden">
				<span className="flex size-2 rounded-full bg-primary" />
				<span className="font-medium text-primary">
					{currentStage_safe.label}
				</span>
				<span className="text-foreground/50">
					({currentIdx + 1}/{STAGES.length})
				</span>
			</div>

			{/* Desktop: todas as etapas */}
			<div className="hidden items-center gap-5 md:flex">
				{STAGES.map((stage, idx) => {
					const isDone =
						doneSet.has(stage.id) ||
						(idx < currentIdx && !doneSet.has(stage.id));
					const isActive = stage.id === currentStage;
					return (
						<div
							key={stage.id}
							className={cn(
								"flex items-center gap-1.5",
								isActive && "font-medium text-primary",
								!isActive && !isDone && "text-foreground/50",
								isDone && !isActive && "text-foreground/70",
							)}
						>
							{isDone ? (
								<CheckIcon
									aria-hidden="true"
									className="size-3.5 text-emerald-600 dark:text-emerald-400"
								/>
							) : (
								<span
									aria-hidden="true"
									className={cn(
										"flex size-2 rounded-full border",
										isActive
											? "border-primary bg-primary"
											: "border-foreground/30 bg-transparent",
									)}
								/>
							)}
							<span>{stage.label}</span>
						</div>
					);
				})}
			</div>
		</output>
	);
}
