"use client";

import { MessageMediaRenderer } from "@saas/chat/components/MessageMediaRenderer";
import type { ChatMessage } from "@saas/chat/lib/server";
import { cn } from "@ui/lib";
import {
	BotIcon,
	CheckCheckIcon,
	CheckIcon,
	ClockIcon,
	TriangleAlertIcon,
} from "lucide-react";

type Props = {
	message: ChatMessage;
};

function formatTime(d: Date): string {
	const date = typeof d === "string" ? new Date(d) : d;
	const hh = String(date.getHours()).padStart(2, "0");
	const mm = String(date.getMinutes()).padStart(2, "0");
	return `${hh}:${mm}`;
}

function StatusIcon({ status }: { status: ChatMessage["status"] }) {
	const base = "size-3";
	if (status === "PENDING")
		return <ClockIcon className={cn(base, "text-foreground/40")} />;
	if (status === "FAILED")
		return <TriangleAlertIcon className={cn(base, "text-rose-500")} />;
	if (status === "READ")
		return <CheckCheckIcon className={cn(base, "text-sky-400")} />;
	if (status === "DELIVERED")
		return <CheckCheckIcon className={cn(base, "text-foreground/50")} />;
	return <CheckIcon className={cn(base, "text-foreground/50")} />;
}

export function MessageBubble({ message }: Props) {
	if (message.senderType === "SYSTEM") {
		return (
			<div className="flex justify-center py-1">
				<span className="rounded-full bg-foreground/5 px-3 py-0.5 text-[11px] text-foreground/55">
					{message.text ?? "Evento do sistema"}
				</span>
			</div>
		);
	}

	const isOutbound = message.direction === "OUTBOUND";
	const isAgent = message.senderType === "AGENT";

	return (
		<div
			className={cn(
				"flex w-full",
				isOutbound ? "justify-end" : "justify-start",
			)}
		>
			<div className={cn("flex max-w-[min(78%,42rem)] flex-col", isOutbound ? "items-end" : "items-start")}>
				{isAgent ? (
					<span className="mb-1 inline-flex items-center gap-1 text-[10px] text-violet-400">
						<BotIcon className="size-3" />
						{message.senderName ?? "Agente IA"}
					</span>
				) : null}

				<div
					className={cn(
						"text-sm leading-relaxed",
						message.type === "TEXT" ? "rounded-2xl px-3 py-2" : "rounded-2xl p-2",
						isOutbound
							? isAgent
								? "rounded-br-sm bg-violet-600 text-white shadow-sm"
								: "rounded-br-sm bg-primary text-primary-foreground shadow-sm"
							: "rounded-bl-sm bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50",
					)}
				>
					{message.type === "TEXT" ? (
						<p className="whitespace-pre-wrap break-words">
							{message.text ?? ""}
						</p>
					) : (
						<MessageMediaRenderer
							message={message}
							isOutbound={isOutbound}
						/>
					)}
				</div>

				<div
					className={cn(
						"mt-0.5 flex items-center gap-1 px-1 text-[10px] text-foreground/45",
						isOutbound ? "flex-row-reverse" : "flex-row",
					)}
				>
					<span>{formatTime(message.createdAt)}</span>
					{isOutbound ? <StatusIcon status={message.status} /> : null}
				</div>
			</div>
		</div>
	);
}
