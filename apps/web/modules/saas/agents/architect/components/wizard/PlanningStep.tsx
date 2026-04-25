"use client";

import { Button } from "@ui/components/button";
import { Textarea } from "@ui/components/textarea";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ArchitectArtifact } from "../../lib/artifact-types";

type NarrativeBlock = { title: string; description: string };

type BlueprintExtended = {
	persona: {
		name: string;
		gender: "FEMININE" | "MASCULINE";
		tone: number;
		formality: number;
		humor: number;
		empathy: number;
		antiPatterns: string[];
	};
	capabilities: string[];
	salesTechniques: Array<{ presetId: string; intensity: string }>;
	narrativeBlocks?: NarrativeBlock[];
};

const CAPABILITY_LABELS: Record<string, string> = {
	qualification: "Qualificação",
	scheduling: "Agendamento",
	faq: "FAQ",
	handoff: "Handoff humano",
	followup: "Follow-up",
};

type Props = {
	sessionId: string;
	existingPlan?: ArchitectArtifact;
	onArtifactUpdated?: (artifact: ArchitectArtifact) => void;
	onApproved: (artifact: ArchitectArtifact) => void;
};

/**
 * Step 2 do wizard (Planejamento).
 *
 * Primeira entrada: busca /api/architect/plan pra gerar blueprint.
 * Mostra blocos narrativos + capabilities + persona. Botões "Ajustar"
 * (textarea com instrução + chama /plan com adjustment) e "Aprovar".
 */
export function PlanningStep({
	sessionId,
	existingPlan,
	onArtifactUpdated,
	onApproved,
}: Props) {
	const [plan, setPlan] = useState<ArchitectArtifact | null>(
		existingPlan ?? null,
	);
	const [isGenerating, setIsGenerating] = useState(!existingPlan);
	const [showAdjustment, setShowAdjustment] = useState(false);
	const [adjustmentText, setAdjustmentText] = useState("");
	const [isApproving, setIsApproving] = useState(false);
	// Dedup ref: React strict mode em dev double-monta o componente e
	// dispararia POST /plan 2x simultâneo. Ref persiste entre re-mounts
	// sincronizados do mesmo sessionId, bloqueando o segundo fetch.
	// Descoberto via Playwright test 2026-04-21 (blueprints duplicados).
	const planFetchInFlight = useRef<string | null>(null);

	// Gera plan inicial se ainda não existe
	useEffect(() => {
		if (plan || !sessionId) return;
		if (planFetchInFlight.current === sessionId) return;
		planFetchInFlight.current = sessionId;
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch("/api/architect/plan", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ sessionId }),
				});
				if (!res.ok) {
					const err = (await res.json().catch(() => null)) as {
						message?: string;
					} | null;
					throw new Error(err?.message ?? "Falha ao gerar plano.");
				}
				const { artifact } = (await res.json()) as {
					artifact: ArchitectArtifact;
				};
				if (!cancelled) setPlan(artifact);
			} catch (err) {
				if (cancelled) return;
				toast.error(
					err instanceof Error ? err.message : "Erro ao gerar plano.",
				);
			} finally {
				if (!cancelled) setIsGenerating(false);
				// Libera ref só após complete (success ou error) pra permitir
				// retry manual se LLM falhar. Cleanup dispara antes em unmount.
				planFetchInFlight.current = null;
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [sessionId, plan]);

	const handleApplyAdjustment = async () => {
		if (!adjustmentText.trim() || isGenerating) return;
		setIsGenerating(true);
		try {
			const res = await fetch("/api/architect/plan", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionId,
					adjustment: adjustmentText.trim(),
				}),
			});
			if (!res.ok) {
				const err = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				throw new Error(err?.message ?? "Falha ao ajustar plano.");
			}
			const { artifact } = (await res.json()) as {
				artifact: ArchitectArtifact;
			};
			setPlan(artifact);
			onArtifactUpdated?.(artifact);
			setAdjustmentText("");
			setShowAdjustment(false);
			toast.success(
				"Plano ajustado. Revise e clique em 'Aprovar plano' pra continuar.",
			);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Erro ao ajustar plano.",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleApprove = async () => {
		if (!plan || isApproving) return;
		setIsApproving(true);
		try {
			const res = await fetch(
				`/api/architect/artifacts/${plan.id}/approve`,
				{ method: "POST" },
			);
			if (!res.ok) {
				throw new Error("Falha ao aprovar plano.");
			}
			const { artifact } = (await res.json()) as {
				artifact: ArchitectArtifact;
			};
			onApproved(artifact);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Erro ao aprovar plano.",
			);
		} finally {
			setIsApproving(false);
		}
	};

	if (isGenerating && !plan) {
		return (
			<div className="mx-auto flex max-w-[720px] flex-col items-center justify-center gap-4 px-4 py-20">
				<Loader2Icon className="size-8 animate-spin text-primary" />
				<p className="text-center font-medium text-foreground/80">
					Montando o plano personalizado do seu agente...
				</p>
				<p className="text-center text-foreground/60 text-sm">
					Analisando as melhores capacidades pro seu negócio.
				</p>
			</div>
		);
	}

	if (!plan) return null;

	const content = plan.content as BlueprintExtended;
	const blocks = content.narrativeBlocks ?? [];

	return (
		<div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-6 md:px-6">
			<header>
				<h1 className="font-semibold text-2xl text-foreground">
					Plano do seu agente
				</h1>
				<p className="mt-1 text-foreground/60 text-sm">
					A IA preparou um plano personalizado. Revise e aprove.
				</p>
			</header>

			<section className="space-y-4">
				{blocks.map((block, idx) => (
					<article
						key={`${idx}-${block.title}`}
						className="rounded-xl border border-border bg-card p-4"
					>
						<h3 className="mb-1.5 font-semibold text-foreground">
							{idx + 1}. {block.title}
						</h3>
						<p className="text-foreground/80 text-sm leading-relaxed">
							{block.description}
						</p>
					</article>
				))}
			</section>

			<section className="rounded-lg border border-border bg-muted/30 p-4">
				<h3 className="mb-3 font-medium text-foreground/80 text-sm">
					Configuração técnica
				</h3>
				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<p className="mb-1.5 text-foreground/60 text-xs uppercase tracking-wide">
							Capabilities
						</p>
						<div className="flex flex-wrap gap-1.5">
							{content.capabilities.map((c) => (
								<span
									key={c}
									className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary text-xs"
								>
									{CAPABILITY_LABELS[c] ?? c}
								</span>
							))}
						</div>
					</div>
					<div>
						<p className="mb-1.5 text-foreground/60 text-xs uppercase tracking-wide">
							Persona
						</p>
						<p className="text-foreground/70 text-xs">
							{content.persona.name} ·{" "}
							{content.persona.gender === "FEMININE"
								? "feminino"
								: "masculino"}{" "}
							· tom {content.persona.tone}, empatia{" "}
							{content.persona.empathy}
						</p>
					</div>
				</div>
			</section>

			{showAdjustment ? (
				<section className="rounded-lg border border-primary/30 bg-primary/5 p-4">
					<h3 className="mb-2 font-medium text-foreground/80 text-sm">
						O que você quer ajustar?
					</h3>
					<Textarea
						rows={3}
						value={adjustmentText}
						onChange={(e) => setAdjustmentText(e.target.value)}
						placeholder="Ex: remova o bloco de follow-up pós-visita, adicione um bloco de qualificação por orçamento..."
						disabled={isGenerating}
						maxLength={1000}
					/>
					<div className="mt-2 flex justify-end gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setShowAdjustment(false);
								setAdjustmentText("");
							}}
							disabled={isGenerating}
						>
							Cancelar
						</Button>
						<Button
							size="sm"
							onClick={handleApplyAdjustment}
							disabled={
								!adjustmentText.trim() || isGenerating
							}
							className="gap-1.5"
						>
							{isGenerating ? (
								<>
									<Loader2Icon className="size-3.5 animate-spin" />
									Ajustando...
								</>
							) : (
								"Aplicar ajuste"
							)}
						</Button>
					</div>
				</section>
			) : null}

			<footer className="flex flex-wrap justify-end gap-2 pt-2">
				{!showAdjustment ? (
					<Button
						variant="outline"
						onClick={() => setShowAdjustment(true)}
						disabled={isGenerating || isApproving}
					>
						Ajustar
					</Button>
				) : null}
				<Button
					onClick={handleApprove}
					disabled={isGenerating || isApproving || showAdjustment}
					className="gap-1.5"
				>
					{isApproving ? (
						<>
							<Loader2Icon className="size-4 animate-spin" />
							Aprovando...
						</>
					) : (
						<>
							<SparklesIcon className="size-4" />
							Aprovar plano
						</>
					)}
				</Button>
			</footer>
		</div>
	);
}
