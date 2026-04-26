import { AsyncLocalStorage } from "node:async_hooks";

/**
 * AsyncLocalStorage propaga contexto através de chamadas async (incluindo
 * `agent.stream` → `tool.execute`). Workaround pra Mastra v1.28 não propagar
 * `requestContext` automaticamente pra tools resolvidas via callback dinâmico.
 *
 * Uso no route handler:
 *   await runWithAtendenteCtx(
 *     { agentId, organizationId, isSandbox: true, atendenteMode: 'sdr' },
 *     () => agent.stream(prompt, { requestContext: ctx })
 *   );
 *
 * Uso nas tools:
 *   const orgId = getAtendenteCtx().organizationId;
 */

export type AtendenteCtx = {
	agentId: string;
	organizationId: string;
	isSandbox?: boolean;
	atendenteMode?: "sdr" | "closer" | "pos-venda";
};

const als = new AsyncLocalStorage<AtendenteCtx>();

export function runWithAtendenteCtx<T>(ctx: AtendenteCtx, fn: () => T): T {
	return als.run(ctx, fn);
}

export function getAtendenteCtx(): AtendenteCtx | undefined {
	return als.getStore();
}
