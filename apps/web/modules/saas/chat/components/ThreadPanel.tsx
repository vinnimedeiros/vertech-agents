"use client";

import { ChatThreadHeader } from "@saas/chat/components/ChatThreadHeader";
import { useConversationMessagesContext } from "@saas/chat/components/ConversationMessagesContext";
import { MediaOverlayProvider } from "@saas/chat/components/MediaOverlayContext";
import { MessageComposer } from "@saas/chat/components/MessageComposer";
import { MessageThread } from "@saas/chat/components/MessageThread";
import type { ConversationDetail } from "@saas/chat/lib/server";

type Props = {
	conversation: ConversationDetail;
};

/**
 * Layout central do chat — 3 elementos EMPILHADOS DESACOPLADOS sobre
 * o canvas dot grid:
 *
 *   1. ChatThreadHeader — FloatingPanel topo (nome/foto/canal contato)
 *   2. MessageThread    — SEM panel: balões aparecem direto sobre canvas
 *   3. MessageComposer  — FloatingPanel embaixo, alto, contém todos
 *                         controles dentro (emoji, imagem, doc, áudio,
 *                         textarea, botão enviar).
 */
export function ThreadPanel({ conversation }: Props) {
	const { messages, appendMessage, confirmMessage, removeMessage } =
		useConversationMessagesContext();

	return (
		<section className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3">
			<MediaOverlayProvider>
				<ChatThreadHeader conversation={conversation} />
				<MessageThread
					conversationId={conversation.id}
					messages={messages}
					unreadCount={conversation.unreadCount}
				/>
				<MessageComposer
					conversationId={conversation.id}
					appendMessage={appendMessage}
					confirmMessage={confirmMessage}
					removeMessage={removeMessage}
				/>
			</MediaOverlayProvider>
		</section>
	);
}
