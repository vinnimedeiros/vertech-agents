"use client";

import type { Message } from "ai/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useArchitectChat } from "../../hooks/useArchitectChat";
import { useDocumentEvents } from "../../hooks/useDocumentEvents";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useSessionEvents } from "../../hooks/useSessionEvents";
import {
	type ArchitectAttachment,
	MAX_ATTACHMENTS,
} from "../../lib/attachment-helpers";
import { ArchitectComposer } from "./ArchitectComposer";
import { ArchitectHeader } from "./ArchitectHeader";
import { AttachmentMenu, type AttachmentMenuHandle } from "./AttachmentMenu";
import { MessageBubble } from "./MessageBubble";
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
 * Shell completo do chat do Arquiteto (stories 09.2 + 09.3 + 09.4 + 09.5).
 *
 * Orquestra:
 * - Estado local de `attachments` (mini-cards pré-envio) via useFileUpload
 * - Streaming token-by-token via useArchitectChat (AI SDK v4 `useChat` com
 *   `streamProtocol: 'text'` apontado pra /api/architect/chat)
 * - StatusBar dinâmica via useSessionEvents (Realtime em
 *   agent_creation_session.draftSnapshot.currentStage)
 * - Status de upload via useDocumentEvents (Realtime em knowledge_document)
 *
 * `handleSend` é stub até o envio aqui: ele chama `sendWithAttachments` do
 * useArchitectChat, passando os documentIds READY/indexed dos anexos. Remove
 * da lista local após envio pra evitar re-enviar os mesmos ids.
 */
export function ChatShell({
	organizationSlug,
	templateId,
	templateLabel,
	sessionId: initialSessionId,
	initialStage = "ideation",
}: Props) {
	const [isDirty, setIsDirty] = useState(false);
	const [currentStage, setCurrentStage] =
		useState<ArchitectStage>(initialStage);
	const [doneStages, setDoneStages] = useState<ArchitectStage[]>([]);
	const [sessionId, setSessionId] = useState<string | undefined>(
		initialSessionId,
	);
	const [attachments, setAttachments] = useState<ArchitectAttachment[]>([]);
	const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
	const menuRef = useRef<AttachmentMenuHandle>(null);

	const { uploadFiles, uploadLink, removeAttachment, ensureSession } =
		useFileUpload({
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

	useSessionEvents({
		sessionId,
		onSessionChange: useCallback((payload) => {
			const nextStage = payload.draftSnapshot?.currentStage;
			if (!nextStage) return;
			setCurrentStage((prev) => {
				if (prev === nextStage) return prev;
				setDoneStages((done) => {
					if (done.includes(prev)) return done;
					return [...done, prev];
				});
				return nextStage as ArchitectStage;
			});
		}, []),
	});

	const {
		messages,
		isLoading,
		error: chatError,
		stop,
		sendWithAttachments,
	} = useArchitectChat({
		sessionId,
		onRateLimited: (retryAfter, message) => {
			toast.error(message);
			setRateLimitUntil(Date.now() + retryAfter * 1000);
			window.setTimeout(() => {
				setRateLimitUntil(null);
			}, retryAfter * 1000);
		},
		onError: (err) => {
			if (err.name === "AbortError") return;
			toast.error(
				err.message || "Erro inesperado. Tente de novo em instantes.",
			);
		},
	});

	const rateLimited = rateLimitUntil !== null && Date.now() < rateLimitUntil;

	const handleSend = async (text: string) => {
		if (rateLimited) return;
		const readyIds = attachments
			.filter(
				(a) =>
					a.documentId &&
					(a.status === "ready" ||
						a.status === "indexed" ||
						a.status === "processing"),
			)
			.map((a) => a.documentId as string);

		try {
			// Cria sessão DRAFT lazy se ainda não existe (primeira mensagem
			// sem upload prévio). ensureSession é idempotente — cache via
			// sessionIdRef do useFileUpload.
			const activeSessionId = await ensureSession();
			// Passa o id via override pra evitar stale closure: setSessionId
			// do parent não propaga ainda no mesmo ciclo síncrono.
			await sendWithAttachments(text, readyIds, activeSessionId);
			setIsDirty(true);
			// Anexos já foram referenciados na mensagem — limpa a lista local.
			setAttachments([]);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Não consegui enviar sua mensagem.",
			);
		}
	};

	const handleLimitReached = () => {
		toast.error(`Máximo de ${MAX_ATTACHMENTS} anexos por mensagem.`);
	};

	const hasUploadingAttachment = attachments.some(
		(a) => a.status === "uploading",
	);
	const composerBlocked = rateLimited || hasUploadingAttachment;

	const renderedMessages = useMemo(() => {
		if (messages.length === 0) return null;
		return (messages as Message[]).map((msg, idx) => {
			const isLast = idx === messages.length - 1;
			const streaming = isLoading && isLast && msg.role === "assistant";
			return (
				<MessageBubble
					key={msg.id}
					role={msg.role}
					content={msg.content}
					isStreaming={streaming}
				/>
			);
		});
	}, [messages, isLoading]);

	const showInitialShimmer = messages.length === 0 && isLoading;

	return (
		<div className="flex h-[calc(100vh-var(--header-height,4rem))] flex-col bg-background">
			<ArchitectHeader
				organizationSlug={organizationSlug}
				templateLabel={templateLabel}
				isDirty={isDirty}
			/>
			<StatusBar currentStage={currentStage} doneStages={doneStages} />
			<MessagesArea isLoadingInitial={showInitialShimmer}>
				{renderedMessages}
				{chatError && !isLoading ? (
					<div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-xs">
						{chatError.message ||
							"Erro de conexão com o Arquiteto."}
					</div>
				) : null}
			</MessagesArea>
			<ArchitectComposer
				onSend={handleSend}
				onOpenAttachmentMenu={() => menuRef.current?.open()}
				attachments={attachments}
				onRemoveAttachment={removeAttachment}
				blocked={composerBlocked}
				disabled={isLoading}
				onStop={isLoading ? stop : undefined}
				isStreaming={isLoading}
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
