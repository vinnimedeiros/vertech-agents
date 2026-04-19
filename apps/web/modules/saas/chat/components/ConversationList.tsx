"use client";

import { ConversationFilters } from "@saas/chat/components/ConversationFilters";
import { ConversationListItem } from "@saas/chat/components/ConversationListItem";
import { NewConversationDialog } from "@saas/chat/components/NewConversationDialog";
import type { ConversationListItem as ConversationListItemType } from "@saas/chat/lib/server";
import {
	STATUS_FILTERS,
	type StatusFilterKey,
} from "@saas/chat/lib/status-config";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { MessageCirclePlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
	conversations: ConversationListItemType[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	organizationSlug: string;
};

export function ConversationList({
	conversations,
	selectedId,
	onSelect,
	organizationSlug,
}: Props) {
	const [newDialogOpen, setNewDialogOpen] = useState(false);
	const [activeFilter, setActiveFilter] = useState<StatusFilterKey>("ALL");
	const [search, setSearch] = useState("");

	const counts = useMemo(() => {
		const result: Record<StatusFilterKey, number> = {
			ALL: conversations.length,
			NEW: 0,
			ACTIVE: 0,
			WAITING: 0,
		};
		for (const c of conversations) {
			if (c.status === "NEW") result.NEW++;
			else if (c.status === "ACTIVE") result.ACTIVE++;
			else if (c.status === "WAITING") result.WAITING++;
		}
		return result;
	}, [conversations]);

	const filtered = useMemo(() => {
		const filterCfg = STATUS_FILTERS.find((f) => f.key === activeFilter);
		const term = search.trim().toLowerCase();
		return conversations.filter((c) => {
			if (filterCfg?.matches && !filterCfg.matches.includes(c.status)) return false;
			if (term) {
				const name = c.contact.name?.toLowerCase() ?? "";
				const phone = c.contact.phone?.toLowerCase() ?? "";
				const email = c.contact.email?.toLowerCase() ?? "";
				const preview = c.lastMessagePreview?.toLowerCase() ?? "";
				if (
					!name.includes(term) &&
					!phone.includes(term) &&
					!email.includes(term) &&
					!preview.includes(term)
				) {
					return false;
				}
			}
			return true;
		});
	}, [conversations, activeFilter, search]);

	return (
		<aside className="flex h-full w-80 shrink-0 flex-col border-r border-border/60 bg-card/40">
			<div className="flex shrink-0 flex-col gap-3 px-4 pt-4 pb-3 border-b border-border/60">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold text-sm text-foreground">Conversas</h3>
					<button
						type="button"
						onClick={() => setNewDialogOpen(true)}
						className={cn(
							"flex size-8 items-center justify-center rounded-full text-foreground/70",
							"hover:bg-foreground/5 hover:text-foreground",
							"focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
						)}
						title="Nova conversa"
						aria-label="Nova conversa"
					>
						<MessageCirclePlusIcon className="size-4" />
					</button>
				</div>
				<div className="relative">
					<SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-foreground/50" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar conversas..."
						className="h-9 pl-8 text-sm"
					/>
				</div>
				<ConversationFilters
					active={activeFilter}
					counts={counts}
					onChange={setActiveFilter}
				/>
			</div>

			<div className="flex-1 overflow-y-auto px-2 py-2">
				{filtered.length === 0 ? (
					<div
						className={cn(
							"flex h-full flex-col items-center justify-center gap-1 py-8 text-center",
							"text-xs text-foreground/55",
						)}
					>
						<span className="font-medium text-foreground/70">
							Nenhuma conversa
						</span>
						<span>
							{search.trim()
								? "Nada encontrado pra essa busca."
								: "Quando chegarem mensagens, elas aparecem aqui."}
						</span>
					</div>
				) : (
					<ul className="flex flex-col gap-0.5">
						{filtered.map((c) => (
							<li key={c.id}>
								<ConversationListItem
									conversation={c}
									isSelected={c.id === selectedId}
									onSelect={onSelect}
									organizationSlug={organizationSlug}
								/>
							</li>
						))}
					</ul>
				)}
			</div>

			<NewConversationDialog
				organizationSlug={organizationSlug}
				open={newDialogOpen}
				onOpenChange={setNewDialogOpen}
			/>
		</aside>
	);
}
