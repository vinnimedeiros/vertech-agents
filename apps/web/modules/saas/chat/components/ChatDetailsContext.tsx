"use client";

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react";

type ChatDetailsContextValue = {
	isOpen: boolean;
	toggle: () => void;
	open: () => void;
	close: () => void;
};

const Context = createContext<ChatDetailsContextValue | null>(null);

export function ChatDetailsProvider({
	children,
	defaultOpen = true,
}: {
	children: ReactNode;
	defaultOpen?: boolean;
}) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	const open = useCallback(() => setIsOpen(true), []);
	const close = useCallback(() => setIsOpen(false), []);
	const toggle = useCallback(() => setIsOpen((v) => !v), []);

	const value = useMemo(
		() => ({ isOpen, open, close, toggle }),
		[isOpen, open, close, toggle],
	);

	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useChatDetails(): ChatDetailsContextValue {
	const ctx = useContext(Context);
	if (!ctx) {
		throw new Error(
			"useChatDetails precisa estar dentro de <ChatDetailsProvider>",
		);
	}
	return ctx;
}
