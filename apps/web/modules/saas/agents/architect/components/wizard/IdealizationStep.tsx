"use client";

import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib";
import { AiStudioIcon } from "@saas/shared/components/AiStudioIcon";
import { Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ArchitectArtifact } from "../../lib/artifact-types";
import type { ArchitectTemplateId } from "../../lib/templates";
import {
	MIN_QUESTIONS_REQUIRED,
	VERTICAL_QUESTIONS,
	getCharLimitPerQuestion,
} from "../../lib/vertical-questions";

type Props = {
	templateId: ArchitectTemplateId;
	sessionId?: string;
	onSessionCreated: (sessionId: string) => void;
	organizationSlug: string;
	onAnalysisReady: (artifact: ArchitectArtifact) => void;
};

type Gender = "FEMININE" | "MASCULINE";

/**
 * Step 1 do wizard (refactor 2026-04-20, inspirado Mercado Agentes
 * pesquisa 2026-04-19 § 3).
 *
 * Form determinístico:
 * - Radio gender (F / M)
 * - 7 perguntas do vertical (checkboxes com textarea expandido inline)
 * - Textarea opcional "Informações adicionais"
 * - Botão "Gerar Análise" → POST /api/architect/analyze → callback parent
 *
 * Char pool dinâmico: 10k total dividido entre perguntas marcadas.
 * Mínimo 3 perguntas respondidas pra habilitar botão.
 */
export function IdealizationStep({
	templateId,
	sessionId: initialSessionId,
	onSessionCreated,
	organizationSlug,
	onAnalysisReady,
}: Props) {
	const questions = VERTICAL_QUESTIONS[templateId] ?? [];
	const [sessionId, setSessionId] = useState<string | undefined>(
		initialSessionId,
	);
	const [gender, setGender] = useState<Gender | null>(null);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [additionalInfo, setAdditionalInfo] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);

	const charLimit = useMemo(
		() => getCharLimitPerQuestion(checkedIds.size),
		[checkedIds.size],
	);

	const toggleQuestion = (id: string) => {
		setCheckedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
				setAnswers((a) => {
					const { [id]: _, ...rest } = a;
					return rest;
				});
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const updateAnswer = (id: string, value: string) => {
		const limit = charLimit;
		setAnswers((prev) => ({
			...prev,
			[id]: value.slice(0, limit),
		}));
	};

	const answeredCount = useMemo(() => {
		let n = 0;
		const ids = Array.from(checkedIds);
		for (const id of ids) {
			if ((answers[id] ?? "").trim().length > 0) n++;
		}
		return n;
	}, [checkedIds, answers]);

	const progressPercent = Math.round(
		(answeredCount / Math.max(MIN_QUESTIONS_REQUIRED, 1)) * 100,
	);
	const canGenerate = !!gender && answeredCount >= MIN_QUESTIONS_REQUIRED;

	const ensureSession = async (): Promise<string> => {
		if (sessionId) return sessionId;
		const res = await fetch("/api/architect/sessions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ organizationSlug, templateId }),
		});
		if (!res.ok) {
			throw new Error("Não consegui iniciar a sessão.");
		}
		const data = (await res.json()) as { sessionId: string };
		setSessionId(data.sessionId);
		onSessionCreated(data.sessionId);
		return data.sessionId;
	};

	const handleGenerate = async () => {
		if (!canGenerate || isGenerating) return;
		setIsGenerating(true);
		try {
			const sid = await ensureSession();
			const payload = {
				sessionId: sid,
				gender,
				answers: Array.from(checkedIds).map((id) => {
					const question = questions.find((q) => q.id === id);
					return {
						questionId: id,
						question: question?.label ?? id,
						answer: answers[id] ?? "",
					};
				}),
				additionalInfo: additionalInfo.trim() || undefined,
			};
			const res = await fetch("/api/architect/analyze", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const err = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				throw new Error(err?.message ?? "Falha ao gerar análise.");
			}
			const { artifact } = (await res.json()) as {
				artifact: ArchitectArtifact;
			};
			onAnalysisReady(artifact);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Erro ao gerar análise.",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-6 md:px-6">
			<header>
				<h1 className="font-semibold text-2xl text-foreground">
					Conte sobre seu negócio
				</h1>
				<p className="mt-1 text-foreground/60 text-sm">
					Responda pelo menos 3 perguntas. A IA analisa e prepara a
					base do seu agente.
				</p>
			</header>

			<section>
				<h2 className="mb-2 font-medium text-sm text-foreground/80">
					Como o assistente deve se apresentar?
				</h2>
				<div className="flex gap-2">
					<GenderPill
						active={gender === "FEMININE"}
						onClick={() => setGender("FEMININE")}
						disabled={isGenerating}
					>
						Feminino
					</GenderPill>
					<GenderPill
						active={gender === "MASCULINE"}
						onClick={() => setGender("MASCULINE")}
						disabled={isGenerating}
					>
						Masculino
					</GenderPill>
				</div>
			</section>

			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="font-medium text-foreground/80 text-sm">
						Perguntas sobre o negócio
					</h2>
					<span className="text-foreground/60 text-xs">
						{answeredCount} de {MIN_QUESTIONS_REQUIRED} mínimas
					</span>
				</div>
				<div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-muted">
					<div
						className={cn(
							"h-full transition-all",
							canGenerate ? "bg-emerald-500" : "bg-primary",
						)}
						style={{
							width: `${Math.min(100, progressPercent)}%`,
						}}
					/>
				</div>
				<p className="mb-3 text-foreground/60 text-xs">
					Marque o máximo que conseguir. Os 10.000 caracteres se
					dividem entre as marcadas ({charLimit}/pergunta com{" "}
					{checkedIds.size || 1} marcada
					{checkedIds.size === 1 ? "" : "s"}).
				</p>
				<div className="flex flex-col gap-2">
					{questions.map((q) => {
						const checked = checkedIds.has(q.id);
						const answer = answers[q.id] ?? "";
						return (
							<div
								key={q.id}
								className={cn(
									"rounded-lg border border-border transition-colors",
									checked && "border-primary/40 bg-card",
								)}
							>
								<label className="flex cursor-pointer items-start gap-3 p-3">
									<Checkbox
										checked={checked}
										onCheckedChange={() =>
											toggleQuestion(q.id)
										}
										disabled={isGenerating}
										className="mt-0.5"
									/>
									<span className="text-foreground text-sm">
										{q.label}
									</span>
								</label>
								{checked ? (
									<div className="px-3 pb-3">
										<Textarea
											rows={3}
											value={answer}
											onChange={(e) =>
												updateAnswer(q.id, e.target.value)
											}
											placeholder={q.placeholder}
											disabled={isGenerating}
											maxLength={charLimit}
										/>
										<div className="mt-1 flex justify-end">
											<span
												className={cn(
													"text-xs",
													answer.length >=
														charLimit
														? "text-destructive"
														: "text-foreground/50",
												)}
											>
												{answer.length}/{charLimit}
											</span>
										</div>
									</div>
								) : null}
							</div>
						);
					})}
				</div>
			</section>

			<section>
				<h2 className="mb-2 font-medium text-foreground/80 text-sm">
					Informações adicionais (opcional)
				</h2>
				<Textarea
					rows={3}
					value={additionalInfo}
					onChange={(e) => setAdditionalInfo(e.target.value)}
					placeholder="Qualquer informação extra sobre seu negócio que possa ajudar..."
					disabled={isGenerating}
					maxLength={2000}
				/>
				<div className="mt-1 flex justify-end">
					<span className="text-foreground/50 text-xs">
						{additionalInfo.length}/2000
					</span>
				</div>
			</section>

			<footer className="flex justify-end pt-2">
				<Button
					size="lg"
					onClick={handleGenerate}
					disabled={!canGenerate || isGenerating}
					className="gap-2"
				>
					{isGenerating ? (
						<>
							<Loader2Icon className="size-4 animate-spin" />
							Analisando...
						</>
					) : (
						<>
							<AiStudioIcon className="size-4" />
							{canGenerate
								? "Gerar Análise"
								: `Gerar Análise (responda ${MIN_QUESTIONS_REQUIRED - answeredCount} a mais)`}
						</>
					)}
				</Button>
			</footer>
		</div>
	);
}

function GenderPill({
	active,
	onClick,
	disabled,
	children,
}: {
	active: boolean;
	onClick: () => void;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"rounded-full border px-4 py-2 font-medium text-sm transition-colors",
				active
					? "border-primary bg-primary text-primary-foreground"
					: "border-border bg-transparent text-foreground/70 hover:border-foreground/30",
				disabled && "opacity-50",
			)}
		>
			{children}
		</button>
	);
}
