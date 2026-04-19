"use client";

import { useChatDetails } from "@saas/chat/components/ChatDetailsContext";
import type { ConversationDetail } from "@saas/chat/lib/server";
import {
	CHANNEL_COLOR,
	CHANNEL_LABEL,
} from "@saas/chat/lib/status-config";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { cn } from "@ui/lib";
import {
	MailIcon,
	MessageCircleIcon,
	MonitorIcon,
	PanelRightCloseIcon,
	PanelRightOpenIcon,
} from "lucide-react";

type Props = {
	conversation: ConversationDetail;
};

function initialsOf(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("");
}

export function ChatThreadHeader({ conversation }: Props) {
	const { isOpen, toggle } = useChatDetails();
	const { contact, channel } = conversation;
	const displayName = contact.name?.trim() || contact.phone || "Sem nome";
	const channelColor = CHANNEL_COLOR[channel];
	const channelLabel = CHANNEL_LABEL[channel];

	const ChannelIcon =
		channel === "EMAIL"
			? MailIcon
			: channel === "WEBCHAT"
				? MonitorIcon
				: MessageCircleIcon;

	const ToggleIcon = isOpen ? PanelRightCloseIcon : PanelRightOpenIcon;

	return (
		<header className="flex shrink-0 items-center gap-3 border-b border-border/60 bg-card/40 px-4 py-3">
			<Avatar className="size-10 rounded-full shrink-0">
				{contact.photoUrl ? (
					<AvatarImage src={contact.photoUrl} alt={displayName} className="rounded-full" />
				) : null}
				<AvatarFallback className="rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm">
					{initialsOf(displayName) || "?"}
				</AvatarFallback>
			</Avatar>

			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-semibold text-foreground">
					{displayName}
				</div>
				<div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-foreground/55">
					<ChannelIcon className={cn("size-3", channelColor)} />
					<span>{channelLabel}</span>
					{contact.phone ? (
						<>
							<span className="text-foreground/30">·</span>
							<span className="truncate">{contact.phone}</span>
						</>
					) : null}
				</div>
			</div>

			<button
				type="button"
				onClick={toggle}
				className={cn(
					"hidden lg:inline-flex rounded-md p-1.5 text-foreground/60 hover:bg-foreground/5 hover:text-foreground",
					"focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
					isOpen && "bg-foreground/5 text-foreground",
				)}
				aria-label={isOpen ? "Fechar painel de detalhes" : "Abrir painel de detalhes"}
				title={isOpen ? "Fechar detalhes" : "Abrir detalhes"}
			>
				<ToggleIcon className="size-4" />
			</button>
		</header>
	);
}
