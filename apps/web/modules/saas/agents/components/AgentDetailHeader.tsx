"use client";

import { getModelLabel } from "@repo/ai/models";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { ArrowLeftIcon, CopyIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	type KeyboardEvent,
	useEffect,
	useRef,
	useState,
	useTransition,
} from "react";
import { toast } from "sonner";
import { duplicateAgentAction, renameAgentAction } from "../lib/actions";
import { useAgent } from "../lib/agent-context";
import {
	getAgentInitials,
	resolveAgentAvatarUrl,
} from "../lib/avatar-helpers";
import { AgentStatusDropdown } from "./AgentStatusDropdown";

type Props = {
	organizationSlug: string;
};

export function AgentDetailHeader({ organizationSlug }: Props) {
	const agent = useAgent();
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [editing, setEditing] = useState(false);
	const [nameDraft, setNameDraft] = useState(agent.name);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setNameDraft(agent.name);
	}, [agent.name]);

	useEffect(() => {
		if (editing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [editing]);

	const isArchived = agent.status === "ARCHIVED";

	const commitRename = () => {
		const trimmed = nameDraft.trim();
		if (trimmed.length < 2 || trimmed.length > 80) {
			toast.error("Nome precisa ter entre 2 e 80 caracteres.");
			setNameDraft(agent.name);
			setEditing(false);
			return;
		}
		if (trimmed === agent.name) {
			setEditing(false);
			return;
		}
		startTransition(async () => {
			try {
				await renameAgentAction(
					{ agentId: agent.id, name: trimmed },
					organizationSlug,
				);
				toast.success("Nome atualizado.");
				setEditing(false);
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível renomear.");
				setNameDraft(agent.name);
				setEditing(false);
			}
		});
	};

	const cancelRename = () => {
		setNameDraft(agent.name);
		setEditing(false);
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			commitRename();
		} else if (e.key === "Escape") {
			e.preventDefault();
			cancelRename();
		}
	};

	const handleDuplicate = () => {
		startTransition(async () => {
			try {
				const res = (await duplicateAgentAction(
					{ agentId: agent.id },
					organizationSlug,
				)) as { agentId: string };
				toast.success("Agente duplicado.");
				router.push(`/app/${organizationSlug}/agents/${res.agentId}`);
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível duplicar.");
			}
		});
	};

	return (
		<div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div className="flex min-w-0 items-center gap-4">
				<Avatar className="size-16 rounded-lg">
					{resolveAgentAvatarUrl(agent.avatarUrl) ? (
						<AvatarImage
							src={resolveAgentAvatarUrl(agent.avatarUrl) ?? undefined}
							alt=""
							className="rounded-lg"
						/>
					) : null}
					<AvatarFallback className="rounded-lg bg-primary/10 text-primary">
						{getAgentInitials(agent.name)}
					</AvatarFallback>
				</Avatar>

				<div className="min-w-0 flex-1">
					{editing && !isArchived ? (
						<Input
							ref={inputRef}
							value={nameDraft}
							onChange={(e) => setNameDraft(e.target.value)}
							onBlur={commitRename}
							onKeyDown={onKeyDown}
							disabled={pending}
							className="h-auto px-2 py-1 font-bold text-2xl lg:text-3xl"
							maxLength={80}
						/>
					) : (
						<h2
							className={cn(
								"truncate font-bold text-2xl lg:text-3xl",
								!isArchived && "cursor-text rounded px-2 py-1 -mx-2 -my-1",
								!isArchived &&
									"hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30",
							)}
							role={isArchived ? undefined : "button"}
							tabIndex={isArchived ? undefined : 0}
							onClick={() => {
								if (!isArchived) setEditing(true);
							}}
							onKeyDown={(e) => {
								if (!isArchived && (e.key === "Enter" || e.key === " ")) {
									e.preventDefault();
									setEditing(true);
								}
							}}
							aria-label={
								isArchived
									? agent.name
									: `Clique pra renomear o agente (${agent.name})`
							}
						>
							{agent.name}
						</h2>
					)}
					<p className="mt-1 truncate text-foreground/60 text-sm">
						{agent.role || "Sem função definida"} · {getModelLabel(agent.model)}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<AgentStatusDropdown
					agentId={agent.id}
					status={agent.status}
					organizationSlug={organizationSlug}
				/>

				<Button
					variant="ghost"
					size="sm"
					onClick={handleDuplicate}
					disabled={pending}
					title="Duplicar agente"
				>
					{pending ? (
						<Loader2Icon className="size-4 animate-spin" />
					) : (
						<CopyIcon className="size-4" />
					)}
					<span className="sr-only">Duplicar</span>
				</Button>

				<Button
					variant="ghost"
					size="sm"
					asChild
					title="Voltar pra lista"
				>
					<Link href={`/app/${organizationSlug}/agents`}>
						<ArrowLeftIcon className="size-4" />
						<span className="sr-only">Voltar</span>
					</Link>
				</Button>
			</div>
		</div>
	);
}
