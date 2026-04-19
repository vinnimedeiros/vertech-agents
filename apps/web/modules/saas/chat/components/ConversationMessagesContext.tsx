"use client";

import {
	ImageGalleryProvider,
	type GalleryImage,
} from "@saas/chat/components/ImageGallery";
import {
	useConversationMessages,
	type ConversationMessagesBag,
} from "@saas/chat/hooks/useConversationMessages";
import type { ChatMessage } from "@saas/chat/lib/server";
import {
	createContext,
	useContext,
	useMemo,
	type ReactNode,
} from "react";

const Context = createContext<ConversationMessagesBag | null>(null);

export function useConversationMessagesContext(): ConversationMessagesBag {
	const ctx = useContext(Context);
	if (!ctx) {
		throw new Error(
			"useConversationMessagesContext precisa estar dentro de <ConversationMessagesProvider>",
		);
	}
	return ctx;
}

type Props = {
	conversationId: string;
	initialMessages: ChatMessage[];
	children: ReactNode;
};

/**
 * Provedor único do state de mensagens da conversa ativa. Compartilhado por
 * ThreadPanel (que renderiza mensagens + compõe novas) e ContactDetailsPanel
 * (que filtra mídias pra galeria lateral). Garante Realtime subscription única
 * e state consistente.
 *
 * Também provê o ImageGalleryProvider derivado das mensagens — assim
 * thumbnails tanto na thread quanto no painel direito abrem o mesmo lightbox.
 */
export function ConversationMessagesProvider({
	conversationId,
	initialMessages,
	children,
}: Props) {
	const bag = useConversationMessages(conversationId, initialMessages);
	return (
		<Context.Provider value={bag}>
			<GalleryWrapper>{children}</GalleryWrapper>
		</Context.Provider>
	);
}

function GalleryWrapper({ children }: { children: ReactNode }) {
	const { messages } = useConversationMessagesContext();
	const galleryImages = useMemo<GalleryImage[]>(
		() =>
			messages
				.filter(
					(m: ChatMessage) => m.type === "IMAGE" && !!m.mediaUrl,
				)
				.map((m) => ({
					id: m.id,
					url: m.mediaUrl!,
					fileName: m.mediaFileName,
					caption: m.caption,
				})),
		[messages],
	);
	return (
		<ImageGalleryProvider items={galleryImages}>
			{children}
		</ImageGalleryProvider>
	);
}
