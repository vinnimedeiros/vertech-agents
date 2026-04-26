import type { PropsWithChildren } from "react";

/**
 * AI Studio shell — Phase 11 Visão V3.
 *
 * Passthrough neutro. Cada rota decide se quer fundo canvas (Construtor,
 * Editor) ou usar o main padrão do AppShell (Casa).
 */
export default function AiStudioLayout({ children }: PropsWithChildren) {
	return <div className="flex h-full flex-col">{children}</div>;
}
