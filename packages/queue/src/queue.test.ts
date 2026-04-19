import { describe, expect, it } from "vitest";
import {
	agentInvocationJobSchema,
	defaultJobOptions,
} from "../index";

describe("@repo/queue", () => {
	describe("agentInvocationJobSchema", () => {
		it("aceita payload valido", () => {
			const result = agentInvocationJobSchema.parse({
				messageId: "msg_1",
				conversationId: "conv_1",
				organizationId: "org_1",
			});
			expect(result.messageId).toBe("msg_1");
		});

		it("aceita scheduledFor opcional como Date ou string ISO", () => {
			const result = agentInvocationJobSchema.parse({
				messageId: "msg_2",
				conversationId: "conv_2",
				organizationId: "org_2",
				scheduledFor: "2026-04-19T12:00:00.000Z",
			});
			expect(result.scheduledFor).toBeInstanceOf(Date);
		});

		it("rejeita payload com campo vazio", () => {
			expect(() =>
				agentInvocationJobSchema.parse({
					messageId: "",
					conversationId: "conv_1",
					organizationId: "org_1",
				}),
			).toThrow();
		});
	});

	describe("defaultJobOptions", () => {
		it("tem 3 attempts com backoff exponencial", () => {
			expect(defaultJobOptions.attempts).toBe(3);
			expect(defaultJobOptions.backoff).toEqual({
				type: "exponential",
				delay: 2000,
			});
		});

		it("tem retention config pra completed e failed", () => {
			expect(defaultJobOptions.removeOnComplete).toEqual({
				count: 1000,
				age: 3600,
			});
			expect(defaultJobOptions.removeOnFail).toEqual({
				count: 5000,
				age: 86400,
			});
		});
	});
});
