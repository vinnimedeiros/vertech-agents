import IORedis, { type RedisOptions } from "ioredis";
import type { JobsOptions } from "bullmq";

/**
 * Default options aplicadas a TODA queue do workspace.
 *
 * - 3 tentativas com backoff exponencial (2s, 8s, 32s)
 * - Retention de jobs completed: 1000 ultimos OU 1h
 * - Retention de jobs failed: 5000 ultimos OU 24h (mantem mais tempo pra investigacao)
 */
export const defaultJobOptions: JobsOptions = {
	attempts: 3,
	backoff: {
		type: "exponential",
		delay: 2000,
	},
	removeOnComplete: {
		count: 1000,
		age: 3600,
	},
	removeOnFail: {
		count: 5000,
		age: 86400,
	},
};

/**
 * Connection options requeridas pelo BullMQ.
 *
 * `maxRetriesPerRequest: null` e obrigatorio — BullMQ usa blocking commands
 * que nao devem ser interrompidos pelo retry do ioredis.
 */
const redisOptions: RedisOptions = {
	maxRetriesPerRequest: null,
	enableReadyCheck: true,
	lazyConnect: false,
};

/**
 * Singleton de conexao Redis reusado por todas as queues e workers do workspace.
 *
 * Exige variavel `REDIS_URL` em formato `redis://host:port` (ou `rediss://` com TLS).
 * Em dev local: `redis://localhost:6379` (ver docker-compose.dev.yml + docs/infrastructure/redis.md).
 */
function createConnection(): IORedis {
	const url = process.env.REDIS_URL;
	if (!url) {
		throw new Error(
			"REDIS_URL nao configurada. Ver .env.local.example e docs/infrastructure/redis.md",
		);
	}
	return new IORedis(url, redisOptions);
}

let cached: IORedis | null = null;

export function getRedisConnection(): IORedis {
	if (!cached) {
		cached = createConnection();
	}
	return cached;
}

/**
 * Usado em testes e em shutdown gracioso (SIGTERM handler).
 * Fecha conexao ativa; proxima chamada a getRedisConnection() cria nova.
 */
export async function closeRedisConnection(): Promise<void> {
	if (cached) {
		await cached.quit();
		cached = null;
	}
}
