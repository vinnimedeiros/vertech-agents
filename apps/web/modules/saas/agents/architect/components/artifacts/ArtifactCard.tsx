"use client";

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import {
	CheckCircle2Icon,
	CheckIcon,
	Loader2Icon,
	MessageSquareIcon,
	PencilIcon,
} from "lucide-react";
import { type KeyboardEvent, useCallback, useState } from "react";
import {
	ARTIFACT_TYPE_EMOJIS,
	ARTIFACT_TYPE_LABELS,
	type AgentBlueprintContent,
	type ArchitectArtifact,
	type BusinessProfileContent,
	type FinalSummaryContent,
	type KnowledgeBaseContent,
} from "../../lib/artifact-types";
import type {
	BusinessProfileRefineInput,
	KnowledgeBaseRefineInput,
} from "../../lib/inline-refinement-schemas";
import {
	ArtifactInlineRefinement,
	supportsInlineRefinement,
} from "./ArtifactInlineRefinement";
import { AgentBlueprintRenderer } from "./renderers/AgentBlueprintRenderer";
import { BusinessProfileRenderer } from "./renderers/BusinessProfileRenderer";
import { FinalSummaryRenderer } from "./renderers/FinalSummaryRenderer";
import { KnowledgeBaseRenderer } from "./renderers/KnowledgeBaseRenderer";

type Props = {
	artifact: ArchitectArtifact;
	isRegenerating?: boolean;
	isApproving?: boolean;
	isRefining?: boolean;
	isExpanded?: boolean;
	onRefine?: (artifactId: string) => void;
	onChatChange?: (artifactId: string) => void;
	onApprove?: (artifactId: string) => void;
	onRefineSave?: (
		artifactId: string,
		data: BusinessProfileRefineInput | KnowledgeBaseRefineInput,
	) => Promise<void> | void;
	onRefineCancel?: (artifactId: string) => void;
};

/**
 * Card de artefato inline no chat do Arquiteto (story 09.6).
 *
 * 3 estados visuais:
 * - generated/regenerated: footer com 3 ações (Refinar/Chat/Aprovar)
 * - approved: check verde no canto, opacity 70% (hover 100%), sem footer
 * - isRegenerating: shimmer nas linhas do conteúdo
 *
 * Keyboard shortcuts no card focado (Tab): R=Refinar, C=Chat, A=Aprovar.
 *
 * Acessibilidade: role=article + aria-labelledby apontando pro título.
 */
export function ArtifactCard({
	artifact,
	isRegenerating = false,
	isApproving = false,
	isRefining = false,
	isExpanded = false,
	onRefine,
	onChatChange,
	onApprove,
	onRefineSave,
	onRefineCancel,
}: Props) {
	const supportsInline = supportsInlineRefinement(artifact.type);
	const showInlineForm = isExpanded && supportsInline;
	const [imageError, _setImageError] = useState(false);
	const titleId = `artifact-${artifact.id}-title`;
	const isApproved = artifact.status === "APPROVED";
	const label = ARTIFACT_TYPE_LABELS[artifact.type];
	const emoji = ARTIFACT_TYPE_EMOJIS[artifact.type];

	const handleRefine = useCallback(() => {
		if (isApproved || isApproving) return;
		onRefine?.(artifact.id);
	}, [artifact.id, isApproved, isApproving, onRefine]);

	const handleChatChange = useCallback(() => {
		if (isApproved || isApproving) return;
		onChatChange?.(artifact.id);
	}, [artifact.id, isApproved, isApproving, onChatChange]);

	const handleApprove = useCallback(() => {
		if (isApproved || isApproving) return;
		onApprove?.(artifact.id);
	}, [artifact.id, isApproved, isApproving, onApprove]);

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (isApproved) return;
		const key = e.key.toLowerCase();
		if (key === "r") {
			e.preventDefault();
			handleRefine();
			return;
		}
		if (key === "c") {
			e.preventDefault();
			handleChatChange();
			return;
		}
		if (key === "a") {
			e.preventDefault();
			handleApprove();
		}
	};

	return (
		<div
			role="article"
			aria-labelledby={titleId}
			tabIndex={0}
			onKeyDown={handleKeyDown}
			className={cn(
				"group relative max-w-[640px] rounded-xl border border-border bg-card p-5 shadow-sm transition-opacity",
				"focus:outline-none focus:ring-2 focus:ring-primary/40",
				isApproved && "opacity-70 hover:opacity-100",
			)}
		>
			{isApproved ? (
				<div
					aria-label="Artefato aprovado"
					className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white"
				>
					<CheckIcon className="size-3" />
				</div>
			) : null}

			<div className="mb-3 flex items-center gap-2">
				<span className="text-lg" aria-hidden={!imageError}>
					{emoji}
				</span>
				<h3
					id={titleId}
					className="font-semibold text-base text-foreground"
				>
					{label}
				</h3>
			</div>

			<div className="mb-4 h-px w-full bg-border" />

			{isRegenerating ? (
				<Shimmer />
			) : showInlineForm ? (
				<ArtifactInlineRefinement
					artifact={artifact}
					isSaving={isRefining}
					onSave={async (data) => {
						await onRefineSave?.(artifact.id, data);
					}}
					onCancel={() => onRefineCancel?.(artifact.id)}
				/>
			) : (
				<ArtifactContent artifact={artifact} />
			)}

			{!isApproved && !isRegenerating && !showInlineForm ? (
				<div className="mt-5 flex flex-wrap gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleRefine}
						disabled={isApproving}
						aria-label={`Refinar artefato ${label}`}
						className="gap-1.5"
					>
						<PencilIcon className="size-3.5" />
						Refinar
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleChatChange}
						disabled={isApproving}
						aria-label={`Mandar alteração no chat para ${label}`}
						className="gap-1.5"
					>
						<MessageSquareIcon className="size-3.5" />
						Mandar alteração no chat
					</Button>
					<Button
						size="sm"
						onClick={handleApprove}
						disabled={isApproving}
						aria-label={`Aprovar artefato ${label}`}
						className="gap-1.5"
					>
						{isApproving ? (
							<Loader2Icon className="size-3.5 animate-spin" />
						) : (
							<CheckCircle2Icon className="size-3.5" />
						)}
						{isApproving ? "Aprovando..." : "Aprovar"}
					</Button>
				</div>
			) : null}
		</div>
	);
}

function ArtifactContent({ artifact }: { artifact: ArchitectArtifact }) {
	switch (artifact.type) {
		case "BUSINESS_PROFILE":
			return (
				<BusinessProfileRenderer
					content={artifact.content as BusinessProfileContent}
				/>
			);
		case "AGENT_BLUEPRINT":
			return (
				<AgentBlueprintRenderer
					content={artifact.content as AgentBlueprintContent}
				/>
			);
		case "KNOWLEDGE_BASE":
			return (
				<KnowledgeBaseRenderer
					content={artifact.content as KnowledgeBaseContent}
				/>
			);
		case "FINAL_SUMMARY":
			return (
				<FinalSummaryRenderer
					content={artifact.content as FinalSummaryContent}
				/>
			);
	}
}

function Shimmer() {
	return (
		<div className="space-y-2" aria-label="regenerando">
			<div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
			<div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
			<div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
			<div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
			<p className="pt-1 text-foreground/50 text-xs italic">
				Regenerando com sua alteração...
			</p>
		</div>
	);
}
