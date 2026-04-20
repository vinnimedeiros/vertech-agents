"use client";

import { cn } from "@ui/lib";
import { SparklesIcon, UserIcon } from "lucide-react";

type Props = {
	role: "user" | "assistant" | "system" | "data" | "tool";
	content: string;
	isStreaming?: boolean;
};

/**
 * Bubble de mensagem do chat do Arquiteto (story 09.5).
 *
 * Layout minimalista alinhado com o ChatShell:
 * - Avatar do Arquiteto à esquerda (SparklesIcon), user sem avatar à direita
 * - Bubble do user em `bg-primary/5`, Arquiteto em `bg-transparent`
 * - Streaming indicator (cursor piscando) quando `isStreaming`
 *
 * Mensagens `system` e `tool` não renderizam nada (internas do Mastra).
 */
export function MessageBubble({ role, content, isStreaming }: Props) {
	if (role === "system" || role === "tool" || role === "data") return null;

	if (role === "user") {
		return (
			<div className="flex flex-col items-end gap-1">
				<div className="max-w-[85%] rounded-2xl bg-primary/5 px-4 py-2.5 text-sm text-foreground">
					<p className="whitespace-pre-wrap leading-relaxed">
						{content}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-start gap-3">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
				<SparklesIcon className="size-4 text-primary" />
			</div>
			<div className="flex-1 pt-1">
				<p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
					{content}
					{isStreaming ? (
						<span
							aria-hidden="true"
							className={cn(
								"ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-primary/70",
								"animate-pulse",
							)}
						/>
					) : null}
				</p>
			</div>
		</div>
	);
}

export function MessageBubbleUser(_props: Pick<Props, "content">) {
	return <UserIcon className="hidden" />;
}
