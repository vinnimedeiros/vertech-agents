"use client";

import { ChatDetailsProvider } from "@saas/chat/components/ChatDetailsContext";
import { ConversationList } from "@saas/chat/components/ConversationList";
import { useOrgConversations } from "@saas/chat/hooks/useOrgConversations";
import type { ConversationListItem as ConversationListItemType } from "@saas/chat/lib/server";
import { cn } from "@ui/lib";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
	organizationId: string;
	organizationSlug: string;
	initialConversations: ConversationListItemType[];
	children: ReactNode;
};

function ChatShellInner({
	organizationId,
	organizationSlug,
	initialConversations,
	children,
}: Props) {
	const router = useRouter();
	const params = useParams<{ conversationId?: string }>();
	const selectedId = params?.conversationId ?? null;

	const conversations = useOrgConversations({
		organizationId,
		organizationSlug,
		initial: initialConversations,
	});

	function handleSelect(id: string) {
		router.push(`/app/${organizationSlug}/crm/chat/${id}`);
	}

	return (
		<div
			className={cn(
				"relative flex min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-border/60 bg-background",
			)}
		>
			<ConversationList
				conversations={conversations}
				selectedId={selectedId}
				onSelect={handleSelect}
				organizationSlug={organizationSlug}
			/>

			{children}
		</div>
	);
}

export function ChatShell(props: Props) {
	return (
		<ChatDetailsProvider defaultOpen={true}>
			<ChatShellInner {...props} />
		</ChatDetailsProvider>
	);
}
