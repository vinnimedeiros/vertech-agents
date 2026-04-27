import { getRedisConnection } from "@repo/queue";

/**
 * Rate limit simples baseado em Redis (INCR + EXPIRE) pra endpoints do
 * Arquiteto (story 08A.4). Reaproveita a conexão Redis singleton do
 * @repo/queue — não abre novos sockets.
 *
 * Chave: `ratelimit:{bucket}:{userId}` com TTL = windowSeconds.
 * Design:
 * - Primeira chamada no window: SET com TTL e count=1.
 * - Chamadas seguintes: INCR, retorna count.
 * - Se count > limit: bloqueado, retorna retryAfter.
 *
 * NOT atomic em edge case extremo (INCR após key expirar entre GET/SET),
 * mas aceitável pra granularidade de user-level rate limit.
 */
export type RateLimitResult =
	| { allowed: true; remaining: number; resetIn: number }
	| { allowed: false; retryAfter: number };

export type RateLimitConfig = {
	bucket: string;
	limit: number;
	windowSeconds: number;
};

export async function checkRateLimit(
	userId: string,
	config: RateLimitConfig,
): Promise<RateLimitResult> {
	const key = `ratelimit:${config.bucket}:${userId}`;
	const redis = getRedisConnection();

	const current = await redis.incr(key);
	if (current === 1) {
		await redis.expire(key, config.windowSeconds);
	}

	const ttl = await redis.ttl(key);
	const resetIn = ttl > 0 ? ttl : config.windowSeconds;

	if (current > config.limit) {
		return {
			allowed: false,
			retryAfter: resetIn,
		};
	}

	return {
		allowed: true,
		remaining: Math.max(0, config.limit - current),
		resetIn,
	};
}

/**
 * Config pra upload endpoints (AC17 da story 08A.4):
 * 10 uploads por user por 60s.
 */
export const ARCHITECT_UPLOAD_LIMIT: RateLimitConfig = {
	bucket: "architect:upload",
	limit: 10,
	windowSeconds: 60,
};

/**
 * Config pra chat do Arquiteto (story 09.5, tech-spec § 7.3):
 * 10 mensagens por sessao por 60s. A key inclui sessionId, nao userId, pra
 * permitir ao mesmo usuario manter multiplas sessoes em paralelo sem se
 * sabotar. `checkRateLimit` recebe sessionId no slot do `userId`.
 */
export const ARCHITECT_CHAT_LIMIT: RateLimitConfig = {
	bucket: "architect:chat",
	limit: 10,
	windowSeconds: 60,
};
