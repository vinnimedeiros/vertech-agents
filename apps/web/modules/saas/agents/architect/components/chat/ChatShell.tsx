"use client";

import type { Message } from "ai/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useArchitectChat } from "../../hooks/useArchitectChat";
import { useArtifactEvents } from "../../hooks/useArtifactEvents";
import { useDocumentEvents } from "../../hooks/useDocumentEvents";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useSessionEvents } from "../../hooks/useSessionEvents";
import type { ArchitectArtifact } from "../../lib/artifact-types";
import {
	type ArchitectAttachment,
	MAX_ATTACHMENTS,
} from "../../lib/attachment-helpers";
import type {
	BusinessProfileRefineInput,
	KnowledgeBaseRefineInput,
} from "../../lib/inline-refinement-schemas";
import { ArtifactCard } from "../artifacts/ArtifactCard";
import { ArchitectComposer } from "./ArchitectComposer";
import { ArchitectHeader } from "./ArchitectHeader";
import { AttachmentMenu, type AttachmentMenuHandle } from "./AttachmentMenu";
import { ChatWelcomeCta } from "./ChatWelcomeCta";
import { MessageBubble } from "./MessageBubble";
import { MessagesArea } from "./MessagesArea";
import { type ArchitectStage, StatusBar } from "./StatusBar";
import { TypingIndicator } from "./TypingIndicator";

/**
 * Texto-gatilho enviado ao clicar "Iniciar construção". Mensagem do user
 * nunca é renderizada no chat — o Arquiteto responde com apresentação +
 * primeira pergunta, dando ao user a sensação de que a IA começou.
 */
const START_TRIGGER_TEXT =
	"Olá, vamos começar a criar o agente. Se apresente brevemente e faça a primeira pergunta.";

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
	const [hasStarted, setHasStarted] = useState(!!initialSessionId);
	const [isStarting, setIsStarting] = useState(false);
	const [artifacts, setArtifacts] = useState<ArchitectArtifact[]>([]);
	const [approvingId, setApprovingId] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [refiningId, setRefiningId] = useState<string | null>(null);
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

	useArtifactEvents({
		sessionId,
		onInsert: useCallback((artifact) => {
			setArtifacts((prev) => {
				if (prev.some((a) => a.id === artifact.id)) return prev;
				return [...prev, artifact];
			});
		}, []),
		onUpdate: useCallback((artifact) => {
			setArtifacts((prev) =>
				prev.map((a) => (a.id === artifact.id ? artifact : a)),
			);
		}, []),
	});

	// Hidrata artefatos na retomada de sessão — Realtime cobre INSERT/UPDATE
	// durante a conversa, mas a lista inicial tem que vir via fetch.
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
				setArtifacts(data.artifacts ?? []);
			} catch {
				// silencioso — UI degrada graciosamente sem histórico de artefatos
			}
		})();
		return () => {
			aborted = true;
		};
	}, [sessionId]);

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

	const handleStart = async () => {
		if (isStarting) return;
		setIsStarting(true);
		try {
			const activeSessionId = await ensureSession();
			setHasStarted(true);
			await sendWithAttachments(
				START_TRIGGER_TEXT,
				[],
				activeSessionId,
			);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Não consegui iniciar a conversa.",
			);
		} finally {
			setIsStarting(false);
		}
	};

	const handleLimitReached = () => {
		toast.error(`Máximo de ${MAX_ATTACHMENTS} anexos por mensagem.`);
	};

	const handleRefineArtifact = useCallback(
		(artifactId: string) => {
			const artifact = artifacts.find((a) => a.id === artifactId);
			if (!artifact) return;
			if (
				artifact.type === "BUSINESS_PROFILE" ||
				artifact.type === "KNOWLEDGE_BASE"
			) {
				setExpandedId((prev) =>
					prev === artifactId ? null : artifactId,
				);
				return;
			}
			if (artifact.type === "AGENT_BLUEPRINT") {
				toast.info("Refinamento do Blueprint chega na 09.8.");
				return;
			}
			toast.info("Resumo final não suporta edição direta.");
		},
		[artifacts],
	);

	const handleRefineCancel = useCallback((_artifactId: string) => {
		setExpandedId(null);
	}, []);

	const handleRefineSave = useCallback(
		async (
			artifactId: string,
			data:
				| BusinessProfileRefineInput
				| KnowledgeBaseRefineInput,
		) => {
			setRefiningId(artifactId);
			try {
				const res = await fetch(
					`/api/architect/artifacts/${artifactId}/refine`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(data),
					},
				);
				if (!res.ok) {
					const payload = (await res.json().catch(() => null)) as {
						message?: string;
					} | null;
					throw new Error(
						payload?.message ?? "Erro ao salvar alterações.",
					);
				}
				toast.success("Alterações salvas.");
				setExpandedId(null);
			} catch (err) {
				toast.error(
					err instanceof Error
						? err.message
						: "Erro ao salvar alterações.",
				);
			} finally {
				setRefiningId(null);
			}
		},
		[],
	);

	const handleChatChangeArtifact = useCallback((_artifactId: string) => {
		toast.info(
			"Descreva no chat a alteração que quer — o Arquiteto vai aplicar.",
		);
	}, []);

	const handleApproveArtifact = useCallback(async (artifactId: string) => {
		setApprovingId(artifactId);
		try {
			const res = await fetch(
				`/api/architect/artifacts/${artifactId}/approve`,
				{ method: "POST" },
			);
			if (!res.ok) {
				const data = (await res
					.json()
					.catch(() => null)) as { message?: string } | null;
				throw new Error(
					data?.message ?? "Não consegui aprovar o artefato.",
				);
			}
			toast.success("Artefato aprovado. Vamos pra próxima etapa.");
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Erro ao aprovar artefato.",
			);
		} finally {
			setApprovingId(null);
		}
	}, []);

	const hasUploadingAttachment = attachments.some(
		(a) => a.status === "uploading",
	);
	const composerBlocked = rateLimited || hasUploadingAttachment;

	const visibleMessages = useMemo(() => {
		return (messages as Message[]).filter((msg) => {
			// Esconde o trigger oculto que abriu a conversa —
			// user não deve ver a instrução que foi mandada pro LLM.
			if (msg.role === "user" && msg.content === START_TRIGGER_TEXT) {
				return false;
			}
			return true;
		});
	}, [messages]);

	const renderedMessages = useMemo(() => {
		if (visibleMessages.length === 0) return null;
		return visibleMessages.map((msg, idx, arr) => {
			const isLast = idx === arr.length - 1;
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
	}, [visibleMessages, isLoading]);

	// Mostra balão "digitando" quando backend processa mas nenhum token
	// do stream do Arquiteto chegou ainda. Cobre 3 casos:
	// 1. Welcome trigger em voo (isStarting ou isLoading sem mensagens)
	// 2. User mandou msg e está esperando resposta (last msg é user)
	// 3. Stream começou mas assistant content ainda vazio
	const showTypingIndicator = (() => {
		if (!hasStarted) return false;
		if (isStarting) return true;
		if (!isLoading) return false;
		if (visibleMessages.length === 0) return true;
		const last = visibleMessages[visibleMessages.length - 1];
		if (!last) return false;
		if (last.role === "user") return true;
		if (last.role === "assistant" && !last.content.trim()) return true;
		return false;
	})();

	if (!hasStarted) {
		return (
			<div className="flex h-[calc(100vh-var(--header-height,4rem))] flex-col bg-background">
				<ArchitectHeader
					organizationSlug={organizationSlug}
					templateLabel={templateLabel}
					isDirty={isDirty}
				/>
				<StatusBar
					currentStage={currentStage}
					doneStages={doneStages}
				/>
				<ChatWelcomeCta
					templateLabel={templateLabel}
					isStarting={isStarting}
					onStart={() => void handleStart()}
				/>
			</div>
		);
	}

	return (
		<div className="relative flex h-[calc(100vh-var(--header-height,4rem))] flex-col bg-background">
			<ArchitectHeader
				organizationSlug={organizationSlug}
				templateLabel={templateLabel}
				isDirty={isDirty}
			/>
			<StatusBar currentStage={currentStage} doneStages={doneStages} />
			<MessagesArea isLoadingInitial={false}>
				{renderedMessages}
				{artifacts.length > 0 ? (
					<div className="flex flex-col gap-3">
						{artifacts.map((artifact) => (
							<ArtifactCard
								key={artifact.id}
								artifact={artifact}
								isApproving={approvingId === artifact.id}
								isRefining={refiningId === artifact.id}
								isExpanded={expandedId === artifact.id}
								onRefine={handleRefineArtifact}
								onChatChange={handleChatChangeArtifact}
								onApprove={handleApproveArtifact}
								onRefineSave={handleRefineSave}
								onRefineCancel={handleRefineCancel}
							/>
						))}
					</div>
				) : null}
				{showTypingIndicator ? <TypingIndicator /> : null}
				{chatError && !isLoading ? (
					<div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-xs">
						{chatError.message ||
							"Erro de conexão com o Arquiteto."}
					</div>
				) : null}
			</MessagesArea>
			<div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
				<div className="pointer-events-auto">
					<ArchitectComposer
						onSend={handleSend}
						onOpenAttachmentMenu={() => menuRef.current?.open()}
						attachments={attachments}
						onRemoveAttachment={removeAttachment}
						blocked={composerBlocked || showTypingIndicator}
						disabled={isLoading || isStarting}
						onStop={isLoading ? stop : undefined}
						isStreaming={isLoading}
						isWaitingReply={showTypingIndicator}
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
			</div>
		</div>
	);
}
