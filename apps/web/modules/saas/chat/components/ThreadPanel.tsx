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

export function ThreadPanel({ conversation }: Props) {
	const { messages, appendMessage, confirmMessage, removeMessage } =
		useConversationMessagesContext();

	return (
		<section className="relative flex min-w-0 flex-1 flex-col bg-background">
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
