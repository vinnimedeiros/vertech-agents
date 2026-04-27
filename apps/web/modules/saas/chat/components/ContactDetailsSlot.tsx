"use client";

import { useChatDetails } from "@saas/chat/components/ChatDetailsContext";
import { FloatingPanel } from "@saas/shared/floating";
import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
};

export function ContactDetailsSlot({ children }: Props) {
	const { isOpen } = useChatDetails();
	if (!isOpen) return null;

	return (
		<FloatingPanel
			as="aside"
			className="hidden h-full w-80 shrink-0 flex-col overflow-y-auto lg:flex"
		>
			{children}
		</FloatingPanel>
	);
}
