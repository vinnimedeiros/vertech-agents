/**
 * Runtime invoker — ponto de entrada quando uma mensagem inbound precisa ser
 * processada pelo agente.
 *
 * STUB em Phase 07A — implementacao real entregue na story 07A.6, onde
 * este arquivo e reescrito com o fluxo completo:
 * 1. Busca message + conversation + agent do banco
 * 2. Guards (message ja SENT, IA desabilitada, agent nao ACTIVE)
 * 3. Marca message PROCESSING
 * 4. Monta runtimeContext
 * 5. Invoca commercialAgent.generate()
 * 6. Persiste outbound message
 * 7. Envia via @repo/whatsapp
 */

export type InvokeAgentForMessageInput = {
	messageId: string;
};

export async function invokeAgentForMessage(
	_input: InvokeAgentForMessageInput,
): Promise<void> {
	throw new Error(
		"invokeAgentForMessage nao implementado — ver story 07A.6 (packages/ai/src/mastra/runtime/invoker.ts)",
	);
}
