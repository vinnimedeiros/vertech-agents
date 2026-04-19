"use client";

import { MediaComposerOverlay } from "@saas/chat/components/MediaComposerOverlay";
import type { MediaComposerKind } from "@saas/chat/components/MediaComposerOverlay";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react";

type OverlayState = {
	file: File;
	kind: MediaComposerKind;
	onSend: (caption: string | null) => void | Promise<void>;
};

type ContextValue = {
	open: (state: OverlayState) => void;
	close: () => void;
	isOpen: boolean;
};

const Context = createContext<ContextValue | null>(null);

export function useMediaOverlay(): ContextValue {
	const ctx = useContext(Context);
	if (!ctx) {
		throw new Error(
			"useMediaOverlay precisa estar dentro de <MediaOverlayProvider>",
		);
	}
	return ctx;
}

type ProviderProps = {
	children: ReactNode;
};

export function MediaOverlayProvider({ children }: ProviderProps) {
	const [state, setState] = useState<OverlayState | null>(null);

	const open = useCallback((next: OverlayState) => setState(next), []);
	const close = useCallback(() => setState(null), []);

	async function handleSend(caption: string | null) {
		if (!state) return;
		const cb = state.onSend;
		setState(null);
		await cb(caption);
	}

	const value = useMemo(
		() => ({ open, close, isOpen: !!state }),
		[open, close, state],
	);

	return (
		<Context.Provider value={value}>
			{children}
			<MediaComposerOverlay
				open={!!state}
				file={state?.file ?? null}
				kind={state?.kind ?? "IMAGE"}
				onClose={close}
				onSend={handleSend}
			/>
		</Context.Provider>
	);
}
