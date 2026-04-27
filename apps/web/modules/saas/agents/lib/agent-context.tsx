"use client";

import type { agent as agentTable } from "@repo/database";
import { type ReactNode, createContext, useContext } from "react";

type AgentRow = typeof agentTable.$inferSelect;

const AgentContext = createContext<AgentRow | null>(null);

type Props = {
	agent: AgentRow;
	children: ReactNode;
};

export function AgentProvider({ agent, children }: Props) {
	return (
		<AgentContext.Provider value={agent}>{children}</AgentContext.Provider>
	);
}

/**
 * Hook pra consumir o agente ativo dentro do detalhe.
 * Throwa se usado fora de `<AgentProvider>` — uso correto sempre exige
 * o layout compartilhado do detalhe.
 */
export function useAgent(): AgentRow {
	const value = useContext(AgentContext);
	if (!value) {
		throw new Error("useAgent deve ser usado dentro de <AgentProvider>");
	}
	return value;
}
