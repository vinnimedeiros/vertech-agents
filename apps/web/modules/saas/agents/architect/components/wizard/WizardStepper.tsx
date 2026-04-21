"use client";

import { cn } from "@ui/lib";
import { CheckIcon } from "lucide-react";

export type WizardStep = "idealization" | "planning" | "knowledge" | "creation";

const STEPS: { id: WizardStep; label: string }[] = [
	{ id: "idealization", label: "Idealização" },
	{ id: "planning", label: "Planejamento" },
	{ id: "knowledge", label: "Conhecimento" },
	{ id: "creation", label: "Criação" },
];

type Props = {
	currentStep: WizardStep;
	completedSteps: WizardStep[];
	onStepClick?: (step: WizardStep) => void;
};

/**
 * Stepper horizontal do wizard (refactor 2026-04-20).
 *
 * 4 estados por step:
 * - done: check verde
 * - active: dot primary + label bold
 * - pending: dot muted + label muted
 */
export function WizardStepper({
	currentStep,
	completedSteps,
	onStepClick,
}: Props) {
	const currentIdx = STEPS.findIndex((s) => s.id === currentStep);
	const doneSet = new Set(completedSteps);

	return (
		<div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-2 px-4 py-4 md:px-6">
			{STEPS.map((step, idx) => {
				const isDone = doneSet.has(step.id);
				const isActive = step.id === currentStep;
				const isFuture = !isDone && !isActive;
				const showConnector = idx < STEPS.length - 1;
				const canClick =
					!!onStepClick && (isDone || idx <= currentIdx);

				const content = (
					<div className="flex items-center gap-2">
						{isDone ? (
							<span
								aria-hidden="true"
								className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white"
							>
								<CheckIcon className="size-4" />
							</span>
						) : (
							<span
								aria-hidden="true"
								className={cn(
									"flex size-7 items-center justify-center rounded-full border font-medium text-xs",
									isActive
										? "border-primary bg-primary text-primary-foreground"
										: "border-border bg-background text-foreground/50",
								)}
							>
								{idx + 1}
							</span>
						)}
						<span
							className={cn(
								"hidden font-medium text-sm md:inline",
								isActive && "text-foreground",
								isFuture && "text-foreground/50",
								isDone && "text-foreground/70",
							)}
						>
							{step.label}
						</span>
					</div>
				);

				return (
					<div
						key={step.id}
						className="flex flex-1 items-center gap-2"
					>
						{canClick ? (
							<button
								type="button"
								onClick={() => onStepClick?.(step.id)}
								className={cn(
									"rounded-md px-1 py-0.5 transition-opacity hover:opacity-80",
									"focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
								)}
							>
								{content}
							</button>
						) : (
							<div className="px-1 py-0.5">{content}</div>
						)}
						{showConnector ? (
							<div
								aria-hidden="true"
								className={cn(
									"h-px flex-1",
									idx < currentIdx
										? "bg-emerald-500/40"
										: "bg-border",
								)}
							/>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
