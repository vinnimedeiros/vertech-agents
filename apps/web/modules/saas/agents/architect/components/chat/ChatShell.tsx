"use client";

import { useState } from "react";
import { ArchitectComposer } from "./ArchitectComposer";
import { ArchitectHeader } from "./ArchitectHeader";
import { MessagesArea } from "./MessagesArea";
import { type ArchitectStage, StatusBar } from "./StatusBar";

type Props = {
	organizationSlug: string;
	templateLabel: string;
	sessionId?: string;
	initialStage?: ArchitectStage;
};

/**
 * Shell completo do chat do Arquiteto (story 09.2 + 09.3).
 *
 * Layout vertical em 4 zonas:
 * 1. Header fino (h-12)
 * 2. Status-bar fino (h-7)
 * 3. MessagesArea (flex-1)
 * 4. ArchitectComposer (sticky bottom) — 09.3 entrega composer real
 *
 * State local:
 * - `isDirty`: flag atualizado quando user digita a 1a mensagem.
 *   Controla AlertDialog no header ao sair.
 * - `currentStage`: etapa atual exibida na StatusBar. Default 'ideation'.
 *
 * `onSend` aqui e stub ate 09.5 (Mastra `useChat`) plugar envio real.
 * `onOpenAttachmentMenu` fica null ate 09.4 (AttachmentMenu) plugar menu.
 * Props `sessionId` sera consumido pela 09.5 pra carregar thread + working memory.
 */
export function ChatShell({
	organizationSlug,
	templateLabel,
	sessionId: _sessionId,
	initialStage = "ideation",
}: Props) {
	const [isDirty, setIsDirty] = useState(false);
	const [currentStage] = useState<ArchitectStage>(initialStage);

	const handleSend = async (text: string) => {
		// Stub pra 09.5 substituir por `append({ role: 'user', content: text })`
		// do AI SDK useChat. Aqui apenas marca dirty e loga em dev.
		console.info("[architect-composer] send stub (09.5 implementa)", {
			text,
		});
		setIsDirty(true);
	};

	return (
		<div className="flex h-[calc(100vh-var(--header-height,4rem))] flex-col bg-background">
			<ArchitectHeader
				organizationSlug={organizationSlug}
				templateLabel={templateLabel}
				isDirty={isDirty}
			/>
			<StatusBar currentStage={currentStage} />
			<MessagesArea isLoadingInitial />
			<ArchitectComposer onSend={handleSend} />
		</div>
	);
}
