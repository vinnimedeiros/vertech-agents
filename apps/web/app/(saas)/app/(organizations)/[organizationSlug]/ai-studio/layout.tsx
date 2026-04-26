import type { PropsWithChildren } from "react";

/**
 * AI Studio shell — Phase 11 Visão V3.
 *
 * Container minimal pra rotas /ai-studio/*. Header e padding gerenciados
 * por cada página individual pra permitir layouts diferentes (lista vs
 * canvas vs editor).
 */
export default function AiStudioLayout({ children }: PropsWithChildren) {
	return <div className="flex min-h-[calc(100vh-4rem)] flex-col">{children}</div>;
}
