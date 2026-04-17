import { EventEmitter } from "node:events";
import type { DomainEvent, DomainEventMap, DomainEventType } from "./types";

/**
 * In-memory pub/sub for domain events.
 *
 * Single process only — suficiente enquanto Next.js + workers rodam no mesmo container Coolify.
 * Se escalar pra multi-instance, trocar por Redis Pub/Sub ou NATS mantendo a mesma interface.
 *
 * Wildcard listener: subscrever em "*" para capturar TODOS os eventos (usado pelo audit middleware).
 */
class DomainEventBus {
	private emitter = new EventEmitter();

	constructor() {
		// Default 10 listeners é baixo demais — queremos vários subscribers por evento
		this.emitter.setMaxListeners(100);
	}

	/**
	 * Emit a typed domain event.
	 * Also emits the wildcard "*" event so middleware (audit log) can observe every event.
	 */
	emitEvent<E extends DomainEvent>(event: E): void {
		this.emitter.emit(event.type, event);
		this.emitter.emit("*", event);
	}

	/**
	 * Subscribe to a specific event type.
	 * Returns an unsubscribe function.
	 */
	on<K extends DomainEventType>(
		type: K,
		handler: (event: DomainEventMap[K]) => void | Promise<void>,
	): () => void {
		const wrapped = (event: DomainEvent) => {
			void handler(event as DomainEventMap[K]);
		};
		this.emitter.on(type, wrapped);
		return () => {
			this.emitter.off(type, wrapped);
		};
	}

	/**
	 * Subscribe to ALL events (wildcard). Used primarily by audit middleware.
	 */
	onAll(handler: (event: DomainEvent) => void | Promise<void>): () => void {
		const wrapped = (event: DomainEvent) => {
			void handler(event);
		};
		this.emitter.on("*", wrapped);
		return () => {
			this.emitter.off("*", wrapped);
		};
	}

	/**
	 * Remove all listeners (test-only).
	 */
	clearAll(): void {
		this.emitter.removeAllListeners();
	}
}

/**
 * Process-wide singleton. Import this in server actions / workers / tools.
 *
 * ```ts
 * import { bus } from "@repo/events";
 *
 * bus.emitEvent({
 *   type: "lead.stage.changed",
 *   payload: { leadId, fromStageId, toStageId, fromCategory, toCategory },
 *   meta: { orgId, actorType: "user", actorId: userId, timestamp: new Date() },
 * });
 * ```
 */
export const bus = new DomainEventBus();

export type { DomainEventBus };
