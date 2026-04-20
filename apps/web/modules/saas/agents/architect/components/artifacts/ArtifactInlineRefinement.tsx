"use client";

import type {
	ArchitectArtifact,
	BusinessProfileContent,
	KnowledgeBaseContent,
} from "../../lib/artifact-types";
import type {
	BusinessProfileRefineInput,
	KnowledgeBaseRefineInput,
} from "../../lib/inline-refinement-schemas";
import { BusinessProfileForm } from "./forms/BusinessProfileForm";
import { KnowledgeBaseForm } from "./forms/KnowledgeBaseForm";

type Props = {
	artifact: ArchitectArtifact;
	isSaving: boolean;
	onSave: (
		data: BusinessProfileRefineInput | KnowledgeBaseRefineInput,
	) => Promise<void> | void;
	onCancel: () => void;
};

/**
 * Wrapper do refinamento inline (story 09.7). Escolhe o form correto pelo
 * tipo do artefato. Só cobre BUSINESS_PROFILE e KNOWLEDGE_BASE — Blueprint
 * usa Dialog (09.8), FinalSummary é readonly.
 */
export function ArtifactInlineRefinement({
	artifact,
	isSaving,
	onSave,
	onCancel,
}: Props) {
	if (artifact.type === "BUSINESS_PROFILE") {
		return (
			<BusinessProfileForm
				initial={artifact.content as BusinessProfileContent}
				isSaving={isSaving}
				onSave={onSave}
				onCancel={onCancel}
			/>
		);
	}
	if (artifact.type === "KNOWLEDGE_BASE") {
		return (
			<KnowledgeBaseForm
				initial={artifact.content as KnowledgeBaseContent}
				isSaving={isSaving}
				onSave={onSave}
				onCancel={onCancel}
			/>
		);
	}
	return null;
}

/**
 * Indica se o tipo suporta refinamento inline (pattern híbrido UI Spec § 6.2).
 */
export function supportsInlineRefinement(type: ArchitectArtifact["type"]) {
	return type === "BUSINESS_PROFILE" || type === "KNOWLEDGE_BASE";
}
