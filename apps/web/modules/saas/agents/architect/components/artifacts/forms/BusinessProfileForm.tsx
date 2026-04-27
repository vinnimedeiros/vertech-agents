"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { TagList } from "../../../../components/TagList";
import type { BusinessProfileContent } from "../../../lib/artifact-types";
import {
	type BusinessProfileRefineInput,
	businessProfileRefineSchema,
} from "../../../lib/inline-refinement-schemas";

type Props = {
	initial: BusinessProfileContent;
	isSaving: boolean;
	onSave: (data: BusinessProfileRefineInput) => Promise<void> | void;
	onCancel: () => void;
};

export function BusinessProfileForm({
	initial,
	isSaving,
	onSave,
	onCancel,
}: Props) {
	const [businessName, setBusinessName] = useState(initial.businessName);
	const [summary, setSummary] = useState(initial.summary);
	const [offering, setOffering] = useState<string[]>(initial.offering);
	const [targetAudience, setTargetAudience] = useState(
		initial.targetAudience,
	);
	const [goalForAgent, setGoalForAgent] = useState(initial.goalForAgent);
	const [differentiator, setDifferentiator] = useState(
		initial.differentiator ?? "",
	);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleSubmit = async () => {
		const parsed = businessProfileRefineSchema.safeParse({
			businessName,
			summary,
			offering,
			targetAudience,
			goalForAgent,
			differentiator: differentiator.trim() || undefined,
		});
		if (!parsed.success) {
			const next: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path.join(".");
				next[key] = issue.message;
			}
			setErrors(next);
			return;
		}
		setErrors({});
		await onSave(parsed.data);
	};

	return (
		<div className="space-y-4 text-sm">
			<Field
				label="Nome do negócio"
				error={errors.businessName}
				counter={`${businessName.length}/80`}
			>
				<Input
					value={businessName}
					onChange={(e) => setBusinessName(e.target.value.slice(0, 80))}
					disabled={isSaving}
					maxLength={80}
				/>
			</Field>

			<Field
				label="Resumo executivo"
				error={errors.summary}
				counter={`${summary.length}/400`}
			>
				<Textarea
					rows={3}
					value={summary}
					onChange={(e) =>
						setSummary(e.target.value.slice(0, 400))
					}
					disabled={isSaving}
				/>
			</Field>

			<Field label="Oferta (produtos/serviços)" error={errors.offering}>
				<TagList
					value={offering}
					onChange={setOffering}
					maxItems={20}
					maxItemLength={120}
					placeholder="Ex.: Limpeza dental, Clareamento..."
					disabled={isSaving}
				/>
			</Field>

			<Field
				label="Público-alvo"
				error={errors.targetAudience}
				counter={`${targetAudience.length}/200`}
			>
				<Textarea
					rows={2}
					value={targetAudience}
					onChange={(e) =>
						setTargetAudience(e.target.value.slice(0, 200))
					}
					disabled={isSaving}
				/>
			</Field>

			<Field
				label="Objetivo do agente"
				error={errors.goalForAgent}
				counter={`${goalForAgent.length}/300`}
			>
				<Textarea
					rows={2}
					value={goalForAgent}
					onChange={(e) =>
						setGoalForAgent(e.target.value.slice(0, 300))
					}
					disabled={isSaving}
				/>
			</Field>

			<Field
				label="Diferencial (opcional)"
				error={errors.differentiator}
				counter={`${differentiator.length}/300`}
			>
				<Textarea
					rows={2}
					value={differentiator}
					onChange={(e) =>
						setDifferentiator(e.target.value.slice(0, 300))
					}
					disabled={isSaving}
				/>
			</Field>

			<div className="flex items-center justify-end gap-2 pt-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={onCancel}
					disabled={isSaving}
				>
					Cancelar
				</Button>
				<Button
					size="sm"
					onClick={handleSubmit}
					disabled={isSaving}
					className="gap-1.5"
				>
					{isSaving ? (
						<>
							<Loader2Icon className="size-3.5 animate-spin" />
							Salvando...
						</>
					) : (
						"Salvar alterações"
					)}
				</Button>
			</div>
		</div>
	);
}

function Field({
	label,
	error,
	counter,
	children,
}: {
	label: string;
	error?: string;
	counter?: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="mb-1 flex items-center justify-between">
				<label
					className={cn(
						"font-medium text-foreground/70 text-xs uppercase tracking-wide",
						error && "text-destructive",
					)}
				>
					{label}
				</label>
				{counter ? (
					<span className="text-foreground/50 text-xs">
						{counter}
					</span>
				) : null}
			</div>
			{children}
			{error ? (
				<p className="mt-1 text-destructive text-xs">{error}</p>
			) : null}
		</div>
	);
}
