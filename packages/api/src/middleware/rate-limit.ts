import { rateLimiter } from "hono-rate-limiter";

const getClientKey = (c: {
	req: { header: (key: string) => string | undefined };
}) => {
	return (
		c.req.header("x-forwarded-for") ??
		c.req.header("x-real-ip") ??
		"anonymous"
	);
};

/**
 * Rate limit geral — 100 requests por minuto por IP.
 * Aplicado a toda a API como camada base de proteção.
 */
export const globalRateLimit = rateLimiter({
	windowMs: 60 * 1000,
	limit: 100,
	standardHeaders: "draft-6",
	keyGenerator: getClientKey,
	message: "Muitas requisições. Tente novamente em alguns instantes.",
});

/**
 * Rate limit rígido para endpoints de autenticação — 10 tentativas por minuto.
 * Usado em /auth/sign-in, /auth/sign-up, /auth/forgot-password.
 */
export const authRateLimit = rateLimiter({
	windowMs: 60 * 1000,
	limit: 10,
	standardHeaders: "draft-6",
	keyGenerator: getClientKey,
	message: "Muitas tentativas de autenticação. Aguarde um momento.",
});

/**
 * Rate limit para endpoints de IA — 30 requests por minuto por IP.
 * Evita abuso em chamadas caras de LLM.
 */
export const aiRateLimit = rateLimiter({
	windowMs: 60 * 1000,
	limit: 30,
	standardHeaders: "draft-6",
	keyGenerator: getClientKey,
	message: "Limite de requisições à IA atingido. Aguarde um momento.",
});
