/**
 * Dependency injection pra envio externo de mensagens outbound.
 *
 * **Por que este indirection existe:**
 * - @repo/whatsapp depende de @repo/queue (pra dispatch)
 * - @repo/queue depende de @repo/ai (invoker)
 * - Se @repo/queue importasse @repo/whatsapp direto, criariamos ciclo
 *
 * Em vez disso, apps/web/instrumentation.ts (ou outro ponto de boot)
 * registra o sender do @repo/whatsapp neste registry. O worker usa o
 * sender registrado via runtime — zero import direto.
 */

export type OutboundSendInfo = {
	channel: "WHATSAPP" | "EMAIL" | "SMS" | "WEBCHAT" | "INTERNAL";
	channelInstanceId: string | null;
	phone: string | null;
	text: string;
};

export type OutboundSender = (info: OutboundSendInfo) => Promise<void>;

let registeredSender: OutboundSender | null = null;

/**
 * Registra o sender. Chamado uma vez no boot do app.
 * Sobrescreve se ja havia um registrado (ultimo vence).
 */
export function registerOutboundSender(sender: OutboundSender): void {
	registeredSender = sender;
}

export function getOutboundSender(): OutboundSender | null {
	return registeredSender;
}

/**
 * Remove o sender registrado. Util em testes.
 */
export function clearOutboundSender(): void {
	registeredSender = null;
}
