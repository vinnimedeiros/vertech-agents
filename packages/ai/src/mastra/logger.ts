import pino, { type Logger } from "pino";

/**
 * Logger structured do subsistema Mastra.
 *
 * Pino direto (sem transport pretty) — JSON em prod, leve em dev. Usa stderr
 * por default (não polui stdout que pode ser stream do agente).
 *
 * Uso:
 *   logger.info({ leadId, orgId }, "criarLead OK");
 *   logger.warn({ msg: "..." }, "stub");
 *   logger.error({ err }, "falha");
 *
 * Singleton — child loggers via `logger.child({ component: "tools/atendente" })`.
 */
const root: Logger = pino({
	name: "vertech-mastra",
	level: process.env.LOG_LEVEL ?? "info",
	timestamp: pino.stdTimeFunctions.isoTime,
});

export function getLogger(component?: string): Logger {
	return component ? root.child({ component }) : root;
}

export const logger = root;
