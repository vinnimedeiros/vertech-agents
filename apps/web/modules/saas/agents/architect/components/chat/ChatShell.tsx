"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useDocumentEvents } from "../../hooks/useDocumentEvents";
import { useFileUpload } from "../../hooks/useFileUpload";
import {
	type ArchitectAttachment,
	MAX_ATTACHMENTS,
} from "../../lib/attachment-helpers";
import { ArchitectComposer } from "./ArchitectComposer";
import { ArchitectHeader } from "./ArchitectHeader";
import { AttachmentMenu, type AttachmentMenuHandle } from "./AttachmentMenu";
import { MessagesArea } from "./MessagesArea";
import { type ArchitectStage, StatusBar } from "./StatusBar";

type Props = {
	organizationSlug: string;
	templateId: string;
	templateLabel: string;
	sessionId?: string;
	initialStage?: ArchitectStage;
};

/**
 * Shell completo do chat do Arquiteto (story 09.2 + 09.3 + 09.4).
 *
 * Além do layout de 4 zonas (header, status, mensagens, composer), este
 * shell gerencia o ciclo de vida dos anexos do composer:
 * - Estado `attachments` (mini-cards pré-envio) em memória local
 * - Cria sessão DRAFT lazy no primeiro upload via useFileUpload
 * - Subscribe Realtime em knowledge_document via useDocumentEvents (atualiza
 *   status processing → indexed sem polling)
 * - Passa ref pro AttachmentMenu pro composer abrir via Cmd/Ctrl+K
 *
 * `onSend` aqui é stub até 09.5 (Mastra `useChat`) plugar envio real com os
 * attachments serializados no payload.
 */
export function ChatShell({
	organizationSlug,
	templateId,
	templateLabel,
	sessionId: initialSessionId,
	initialStage = "ideation",
}: Props) {
	const [isDirty, setIsDirty] = useState(false);
	const [currentStage] = useState<ArchitectStage>(initialStage);
	const [sessionId, setSessionId] = useState<string | undefined>(
		initialSessionId,
	);
	const [attachments, setAttachments] = useState<ArchitectAttachment[]>([]);
	const menuRef = useRef<AttachmentMenuHandle>(null);

	const { uploadFiles, uploadLink, removeAttachment } = useFileUpload({
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

	const handleSend = async (text: string) => {
		console.info("[architect-composer] send stub (09.5 implementa)", {
			text,
			attachmentIds: attachments
				.filter((a) => a.documentId)
				.map((a) => a.documentId),
		});
		setIsDirty(true);
	};

	const handleLimitReached = () => {
		toast.error(`Máximo de ${MAX_ATTACHMENTS} anexos por mensagem.`);
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
			<ArchitectComposer
				onSend={handleSend}
				onOpenAttachmentMenu={() => menuRef.current?.open()}
				attachments={attachments}
				onRemoveAttachment={removeAttachment}
				attachmentSlot={
					<AttachmentMenu
						ref={menuRef}
						attachmentCount={attachments.length}
						onFilesSelected={(files) => {
							setIsDirty(true);
							void uploadFiles(files);
						}}
						onLinkSubmitted={(url) => {
							setIsDirty(true);
							void uploadLink(url);
						}}
						onLimitReached={handleLimitReached}
					/>
				}
			/>
		</div>
	);
}
