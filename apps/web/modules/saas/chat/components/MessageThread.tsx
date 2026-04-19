"use client";

import { MessageBubble } from "@saas/chat/components/MessageBubble";
import { markConversationAsReadAction } from "@saas/chat/lib/actions";
import type { ChatMessage } from "@saas/chat/lib/server";
import { cn } from "@ui/lib";
import { useEffect, useMemo, useRef } from "react";

type Props = {
	conversationId: string;
	messages: ChatMessage[];
	unreadCount: number;
};

function dateLabel(d: Date): string {
	const date = new Date(d);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);

	const isSameDay = (a: Date, b: Date) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();

	if (isSameDay(date, today)) return "Hoje";
	if (isSameDay(date, yesterday)) return "Ontem";
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
		year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
	});
}

export function MessageThread({ conversationId, messages, unreadCount }: Props) {
	const bottomRef = useRef<HTMLDivElement>(null);
	const didInitialScrollRef = useRef(false);

	// Reset do flag ao trocar de conversa — garante scroll instantâneo ao abrir.
	useEffect(() => {
		didInitialScrollRef.current = false;
	}, [conversationId]);

	// Auto-scroll pro final quando há mensagens. No primeiro render de uma
	// conversa, pula direto (auto) pra não animar do topo pro final.
	// Depois usa smooth pra novas mensagens.
	useEffect(() => {
		if (messages.length === 0) return;
		const behavior: ScrollBehavior = didInitialScrollRef.current
			? "smooth"
			: "auto";
		bottomRef.current?.scrollIntoView({ behavior, block: "end" });
		didInitialScrollRef.current = true;
	}, [messages.length]);

	// Zera unread ao abrir
	useEffect(() => {
		if (unreadCount > 0) {
			void markConversationAsReadAction(conversationId).catch(() => {});
		}
	}, [conversationId, unreadCount]);

	const groups = useMemo(() => {
		// Confia na ordem de inserção (array). Evita instabilidade quando há
		// divergência de ms entre createdAt do client (optimistic temp) e do
		// server (insert real) — sort causaria bubble "sobe e desce".
		const result: { label: string; items: ChatMessage[] }[] = [];
		let currentLabel: string | null = null;
		for (const m of messages) {
			const label = dateLabel(m.createdAt);
			if (label !== currentLabel) {
				result.push({ label, items: [] });
				currentLabel = label;
			}
			result[result.length - 1].items.push(m);
		}
		return result;
	}, [messages]);

	if (messages.length === 0) {
		return (
			<div
				className={cn(
					"flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center",
					"text-xs text-foreground/55",
					"bg-background bg-[url('/images/testlightwpp.png')] bg-cover bg-center",
					"dark:bg-[url('/images/testewwpdark.png')]",
				)}
			>
				<span className="font-medium text-foreground/70">
					Sem mensagens ainda
				</span>
				<span>Envie a primeira mensagem pra começar a conversa.</span>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto bg-background bg-[url('/images/testlightwpp.png')] bg-cover bg-center px-4 py-4 dark:bg-[url('/images/testewwpdark.png')]">
			<div className="flex flex-col gap-4">
				{groups.map((g, idx) => (
					<div
						key={`${g.label}-${g.items[0]?.id ?? idx}`}
						className="flex flex-col gap-2"
					>
						<div className="flex justify-center py-1">
							<span className="rounded-full bg-foreground/5 px-3 py-0.5 text-[11px] text-foreground/55">
								{g.label}
							</span>
						</div>
						{g.items.map((m) => (
							<MessageBubble key={m.id} message={m} />
						))}
					</div>
				))}
				<div ref={bottomRef} />
			</div>
		</div>
	);
}
