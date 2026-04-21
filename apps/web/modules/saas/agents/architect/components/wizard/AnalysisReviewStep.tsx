"use client";

import { Button } from "@ui/components/button";
import { Textarea } from "@ui/components/textarea";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
	ArchitectArtifact,
	BusinessProfileContent,
} from "../../lib/artifact-types";

type Props = {
	sessionId: string;
	artifact: ArchitectArtifact;
	onArtifactUpdated: (artifact: ArchitectArtifact) => void;
	onApproved: () => void;
};

/**
 * Sub-step pós "Gerar Análise" (wizard refactor 2026-04-20).
 *
 * Mostra mini-PRD gerado (título + resumo + serviços + objetivos + identidade).
 * Dois botões: "Refinar" abre textarea pra pedir ajustes e chama /analyze
 * novamente; "Aprovar e continuar" avança pro Step 2 (Planejamento).
 */
export function AnalysisReviewStep({
	sessionId,
	artifact,
	onArtifactUpdated,
	onApproved,
}: Props) {
	const [showRefine, setShowRefine] = useState(false);
	const [refineText, setRefineText] = useState("");
	const [isRefining, setIsRefining] = useState(false);
	const [isApproving, setIsApproving] = useState(false);

	const content = artifact.content as BusinessProfileContent;
	const identity = content.suggestedIdentity;
	const goals = content.agentGoals ?? [];

	const handleRefine = async () => {
		if (!refineText.trim() || isRefining) return;
		setIsRefining(true);
		try {
			// Reuso /api/architect/artifacts/[id]/refine (update direto do content)
			// Aqui seria ideal ter um /analyze-refine que chama LLM pra regenerar
			// com base na instrução. Por ora, fazemos via prompt.
			const res = await fetch(
				`/api/architect/artifacts/${artifact.id}/refine-analysis`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ instruction: refineText.trim() }),
				},
			);
			if (!res.ok) {
				const err = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				throw new Error(
					err?.message ?? "Falha ao refinar análise.",
				);
			}
			const { artifact: updated } = (await res.json()) as {
				artifact: ArchitectArtifact;
			};
			onArtifactUpdated(updated);
			setRefineText("");
			setShowRefine(false);
			toast.success("Análise atualizada.");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Erro ao refinar.",
			);
		} finally {
			setIsRefining(false);
		}
	};

	const handleApprove = async () => {
		if (isApproving) return;
		setIsApproving(true);
		try {
			const res = await fetch(
				`/api/architect/artifacts/${artifact.id}/approve`,
				{ method: "POST" },
			);
			if (!res.ok) {
				throw new Error("Falha ao aprovar análise.");
			}
			onApproved();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Erro ao aprovar.",
			);
			setIsApproving(false);
		}
		// sessionId usado na prop pra ref futura
		void sessionId;
	};

	return (
		<div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-6 md:px-6">
			<header>
				<h1 className="font-semibold text-2xl text-foreground">
					Análise do seu negócio
				</h1>
				<p className="mt-1 text-foreground/60 text-sm">
					Revise o que a IA entendeu. Aprove pra seguir, ou peça
					ajustes.
				</p>
			</header>

			<article className="rounded-xl border border-border bg-card p-6">
				<h2 className="mb-2 font-bold text-foreground text-xl">
					{content.businessName}
				</h2>
				<p className="mb-5 text-foreground/80 text-sm leading-relaxed">
					{content.summary}
				</p>

				<section className="mb-5">
					<h3 className="mb-2 font-medium text-foreground/60 text-xs uppercase tracking-wide">
						Serviços identificados
					</h3>
					<ul className="ml-4 list-disc space-y-1 text-foreground/80 text-sm">
						{content.offering.map((s) => (
							<li key={s}>{s}</li>
						))}
					</ul>
				</section>

				<section className="mb-5">
					<h3 className="mb-2 font-medium text-foreground/60 text-xs uppercase tracking-wide">
						Objetivos do agente
					</h3>
					<ul className="ml-4 list-disc space-y-1 text-foreground/80 text-sm">
						{goals.length > 0 ? (
							goals.map((g) => <li key={g}>{g}</li>)
						) : (
							<li>{content.goalForAgent}</li>
						)}
					</ul>
				</section>

				<section className="mb-5">
					<h3 className="mb-2 font-medium text-foreground/60 text-xs uppercase tracking-wide">
						Público-alvo
					</h3>
					<p className="text-foreground/80 text-sm">
						{content.targetAudience}
					</p>
				</section>

				{content.differentiator ? (
					<section className="mb-5">
						<h3 className="mb-2 font-medium text-foreground/60 text-xs uppercase tracking-wide">
							Diferencial
						</h3>
						<p className="text-foreground/80 text-sm">
							{content.differentiator}
						</p>
					</section>
				) : null}

				{identity ? (
					<section>
						<h3 className="mb-2 font-medium text-foreground/60 text-xs uppercase tracking-wide">
							Identidade sugerida
						</h3>
						<div className="grid gap-3 md:grid-cols-3">
							<IdentityCard label="Nome" value={identity.name} />
							<IdentityCard label="Função" value={identity.role} />
							<IdentityCard
								label="Tom"
								value={identity.toneKeyword}
							/>
						</div>
					</section>
				) : null}
			</article>

			{showRefine ? (
				<section className="rounded-lg border border-primary/30 bg-primary/5 p-4">
					<h3 className="mb-2 font-medium text-foreground/80 text-sm">
						O que você gostaria de ajustar?
					</h3>
					<Textarea
						rows={3}
						value={refineText}
						onChange={(e) => setRefineText(e.target.value)}
						placeholder="Ex: o horário correto é das 8h às 18h, também atendemos emergências aos sábados..."
						disabled={isRefining}
						maxLength={1000}
					/>
					<div className="mt-2 flex justify-end gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setShowRefine(false);
								setRefineText("");
							}}
							disabled={isRefining}
						>
							Cancelar
						</Button>
						<Button
							size="sm"
							onClick={handleRefine}
							disabled={!refineText.trim() || isRefining}
							className="gap-1.5"
						>
							{isRefining ? (
								<>
									<Loader2Icon className="size-3.5 animate-spin" />
									Refinando...
								</>
							) : (
								"Aplicar refinamento"
							)}
						</Button>
					</div>
				</section>
			) : null}

			<footer className="flex flex-wrap justify-end gap-2 pt-2">
				{!showRefine ? (
					<Button
						variant="outline"
						onClick={() => setShowRefine(true)}
						disabled={isApproving || isRefining}
					>
						Refinar
					</Button>
				) : null}
				<Button
					onClick={handleApprove}
					disabled={isApproving || showRefine}
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
							Aprovar e continuar
						</>
					)}
				</Button>
			</footer>
		</div>
	);
}

function IdentityCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-border bg-background p-3">
			<p className="mb-1 text-foreground/60 text-xs uppercase tracking-wide">
				{label}
			</p>
			<p className="font-semibold text-foreground text-sm">{value}</p>
		</div>
	);
}
