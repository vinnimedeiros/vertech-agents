import type { ChatChannel, ChatStatus } from "./server";

export type StatusFilterKey =
	| "ALL"
	| "NEW"
	| "ACTIVE"
	| "WAITING";

export type StatusFilterConfig = {
	key: StatusFilterKey;
	label: string;
	dotClass: string;
	matches: ChatStatus[] | null;
};

export const STATUS_FILTERS: StatusFilterConfig[] = [
	{
		key: "ALL",
		label: "Todos",
		dotClass: "bg-zinc-400 dark:bg-zinc-500",
		matches: null,
	},
	{
		key: "NEW",
		label: "Novos",
		dotClass: "bg-rose-500",
		matches: ["NEW"],
	},
	{
		key: "ACTIVE",
		label: "Ativos",
		dotClass: "bg-emerald-500",
		matches: ["ACTIVE"],
	},
	{
		key: "WAITING",
		label: "Espera",
		dotClass: "bg-amber-500",
		matches: ["WAITING"],
	},
];

export const CHANNEL_COLOR: Record<ChatChannel, string> = {
	WHATSAPP: "text-emerald-500",
	EMAIL: "text-sky-500",
	SMS: "text-zinc-400",
	WEBCHAT: "text-violet-500",
	INTERNAL: "text-foreground/60",
};

export const CHANNEL_LABEL: Record<ChatChannel, string> = {
	WHATSAPP: "WhatsApp",
	EMAIL: "Email",
	SMS: "SMS",
	WEBCHAT: "Webchat",
	INTERNAL: "Interno",
};
