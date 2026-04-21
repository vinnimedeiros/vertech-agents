"use client";

import { useCallback, useEffect, useState } from "react";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useDocumentEvents } from "../../hooks/useDocumentEvents";
import type { ArchitectArtifact } from "../../lib/artifact-types";
import type { ArchitectAttachment } from "../../lib/attachment-helpers";
import type { ArchitectTemplateId } from "../../lib/templates";
import { ArchitectHeader } from "../chat/ArchitectHeader";
import { AnalysisReviewStep } from "./AnalysisReviewStep";
import { CreationStep } from "./CreationStep";
import { IdealizationStep } from "./IdealizationStep";
import { KnowledgeStep } from "./KnowledgeStep";
import { PlanningStep } from "./PlanningStep";
import { WizardStepper, type WizardStep } from "./WizardStepper";

type InternalStep =
	| "idealization"
	| "analysis-review"
	| "planning"
	| "knowledge"
	| "creation";

const STEP_MAP: Record<InternalStep, WizardStep> = {
	idealization: "idealization",
	"analysis-review": "idealization",
	planning: "planning",
	knowledge: "knowledge",
	creation: "creation",
};

type Props = {
	organizationSlug: string;
	templateId: ArchitectTemplateId;
	templateLabel: string;
	sessionId?: string;
};

/**
 * Shell do wizard (refactor 2026-04-20, estilo Mercado Agentes).
 *
 * Orquestra 4 steps visuais + sub-step "analysis-review". State local
 * do artifact gerado em cada etapa + progressão linear.
 *
 * Auto-hidrata ao entrar numa sessão existente: busca BusinessProfile +
 * Blueprint pra determinar step atual e pular pra ele.
 */
export function WizardShell({
	organizationSlug,
	templateId,
	templateLabel,
	sessionId: initialSessionId,
}: Props) {
	const [sessionId, setSessionId] = useState<string | undefined>(
		initialSessionId,
	);
	const [step, setStep] = useState<InternalStep>("idealization");
	const [completed, setCompleted] = useState<Set<WizardStep>>(new Set());
	const [businessProfile, setBusinessProfile] =
		useState<ArchitectArtifact | null>(null);
	const [blueprint, setBlueprint] = useState<ArchitectArtifact | null>(null);
	const [attachments, setAttachments] = useState<ArchitectAttachment[]>([]);

	const { uploadFiles, removeAttachment, ensureSession } = useFileUpload({
		organizationSlug,
		templateId,
		initialSessionId,
		onSessionCreated: setSessionId,
		onAttachmentsChange: setAttachments,
	});

	useDocumentEvents({
		sessionId,
		onStatusChange: useCallback((payload) => {
			setAttachments((prev) =>
				prev.map((att) => {
					if (att.documentId !== payload.id) return att;
					if (payload.status === "READY") {
						return { ...att, status: "indexed" };
					}
					if (payload.status === "ERROR") {
						return {
							...att,
							status: "error",
							errorMessage:
								payload.errorMessage ??
								"Falha no processamento.",
						};
					}
					if (payload.status === "PROCESSING") {
						return { ...att, status: "processing" };
					}
					return att;
				}),
			);
		}, []),
	});

	// Hidrata artefatos + deduz step atual ao entrar numa sessão existente.
	useEffect(() => {
		if (!sessionId) return;
		let aborted = false;
		(async () => {
			try {
				const res = await fetch(
					`/api/architect/artifacts?sessionId=${sessionId}`,
				);
				if (!res.ok) return;
				const data = (await res.json()) as {
					artifacts?: ArchitectArtifact[];
				};
				if (aborted) return;

				const artifacts = data.artifacts ?? [];
				const biz =
					artifacts.find((a) => a.type === "BUSINESS_PROFILE") ??
					null;
				const bp =
					artifacts.find((a) => a.type === "AGENT_BLUEPRINT") ?? null;

				setBusinessProfile(biz);
				setBlueprint(bp);

				// Deduz step atual pelo status dos artefatos
				const doneSet = new Set<WizardStep>();
				if (biz?.status === "APPROVED") {
					doneSet.add("idealization");
				}
				if (bp?.status === "APPROVED") {
					doneSet.add("planning");
				}

				setCompleted(doneSet);

				if (bp?.status === "APPROVED") {
					setStep("knowledge");
				} else if (bp) {
					setStep("planning");
				} else if (biz?.status === "APPROVED") {
					setStep("planning");
				} else if (biz) {
					setStep("analysis-review");
				} else {
					setStep("idealization");
				}
			} catch {
				// silencioso
			}
		})();
		return () => {
			aborted = true;
		};
	}, [sessionId]);

	const markCompleted = (target: WizardStep) => {
		setCompleted((prev) => new Set(prev).add(target));
	};

	return (
		<div className="flex min-h-[calc(100vh-var(--header-height,4rem))] flex-col bg-background">
			<ArchitectHeader
				organizationSlug={organizationSlug}
				templateLabel={templateLabel}
				isDirty={
					!!businessProfile ||
					!!blueprint ||
					attachments.length > 0
				}
			/>
			<WizardStepper
				currentStep={STEP_MAP[step]}
				completedSteps={Array.from(completed)}
				onStepClick={(target) => {
					if (target === "idealization") {
						setStep(
							businessProfile ? "analysis-review" : "idealization",
						);
					} else if (
						target === "planning" &&
						(completed.has("idealization") || !!blueprint)
					) {
						setStep("planning");
					} else if (
						target === "knowledge" &&
						completed.has("planning")
					) {
						setStep("knowledge");
					} else if (
						target === "creation" &&
						completed.has("knowledge")
					) {
						setStep("creation");
					}
				}}
			/>
			<main className="flex-1 overflow-y-auto">
				{step === "idealization" ? (
					<IdealizationStep
						templateId={templateId}
						sessionId={sessionId}
						onSessionCreated={setSessionId}
						organizationSlug={organizationSlug}
						onAnalysisReady={(artifact) => {
							setBusinessProfile(artifact);
							setStep("analysis-review");
						}}
					/>
				) : null}

				{step === "analysis-review" && sessionId && businessProfile ? (
					<AnalysisReviewStep
						sessionId={sessionId}
						artifact={businessProfile}
						onArtifactUpdated={setBusinessProfile}
						onApproved={() => {
							markCompleted("idealization");
							setStep("planning");
						}}
					/>
				) : null}

				{step === "planning" && sessionId ? (
					<PlanningStep
						sessionId={sessionId}
						existingPlan={blueprint ?? undefined}
						onApproved={(artifact) => {
							setBlueprint(artifact);
							markCompleted("planning");
							setStep("knowledge");
						}}
					/>
				) : null}

				{step === "knowledge" && sessionId ? (
					<KnowledgeStep
						sessionId={sessionId}
						organizationSlug={organizationSlug}
						templateId={templateId}
						attachments={attachments}
						uploadFiles={async (files) => {
							await ensureSession();
							await uploadFiles(files);
						}}
						removeAttachment={removeAttachment}
						onNext={() => {
							markCompleted("knowledge");
							setStep("creation");
						}}
					/>
				) : null}

				{step === "creation" &&
				sessionId &&
				businessProfile &&
				blueprint ? (
					<CreationStep
						sessionId={sessionId}
						organizationSlug={organizationSlug}
						businessProfile={businessProfile}
						blueprint={blueprint}
					/>
				) : null}
			</main>
		</div>
	);
}
