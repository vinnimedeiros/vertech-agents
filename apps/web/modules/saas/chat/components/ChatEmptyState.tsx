import { MessageSquareIcon } from "lucide-react";

export function ChatEmptyState() {
	return (
		<section className="flex min-w-0 flex-1 flex-col items-center justify-center text-center text-foreground/55">
			<MessageSquareIcon className="size-10 text-foreground/30" />
			<p className="mt-3 text-sm font-medium text-foreground/70">
				Selecione uma conversa
			</p>
			<p className="mt-1 max-w-sm text-xs">
				Escolhe uma conversa na lista pra começar.
			</p>
		</section>
	);
}
