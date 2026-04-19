"use client";

import { useChatDetails } from "@saas/chat/components/ChatDetailsContext";
import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
};

export function ContactDetailsSlot({ children }: Props) {
	const { isOpen } = useChatDetails();
	if (!isOpen) return null;

	return (
		<aside className="hidden w-80 shrink-0 flex-col border-l border-border/60 bg-card/40 lg:flex">
			{children}
		</aside>
	);
}
