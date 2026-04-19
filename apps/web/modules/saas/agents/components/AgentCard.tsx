import { getModelLabel } from "@repo/ai/models";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { cn } from "@ui/lib";
import { PhoneIcon, PhoneOffIcon } from "lucide-react";
import Link from "next/link";
import type { AgentListRow } from "../lib/server";
import { AgentCardActions } from "./AgentCardActions";
import { AgentStatusBadge } from "./AgentStatusBadge";

type Props = {
	agent: AgentListRow;
	organizationSlug: string;
	whatsappInstanceName?: string | null;
};

function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("");
}

export function AgentCard({
	agent,
	organizationSlug,
	whatsappInstanceName,
}: Props) {
	const detailHref = `/app/${organizationSlug}/agents/${agent.id}`;
	const hasWhatsApp = !!agent.whatsappInstanceId;

	return (
		<Link
			href={detailHref}
			className={cn(
				"group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all",
				"hover:border-primary/50 hover:shadow-md",
			)}
		>
			<div className="flex w-full items-start justify-between gap-2">
				<div className="flex items-center gap-3 min-w-0">
					<Avatar className="size-12 shrink-0 rounded-lg">
						{agent.avatarUrl ? (
							<AvatarImage
								src={agent.avatarUrl}
								alt=""
								className="rounded-lg"
							/>
						) : null}
						<AvatarFallback className="rounded-lg bg-primary/10 text-primary">
							{initials(agent.name) || "AG"}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<h3 className="truncate font-semibold text-foreground text-sm">
							{agent.name}
						</h3>
						<p className="truncate text-foreground/60 text-xs">
							{agent.role || "Sem função definida"}
						</p>
					</div>
				</div>
				<div
					// evita que o click do dropdown navegue pro detalhe via <Link>
					onClick={(e) => e.preventDefault()}
					onKeyDown={(e) => e.stopPropagation()}
					role="presentation"
				>
					<AgentCardActions
						agentId={agent.id}
						agentName={agent.name}
						status={agent.status}
						organizationSlug={organizationSlug}
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<AgentStatusBadge status={agent.status} />
				<span className="text-foreground/60 text-xs">
					{getModelLabel(agent.model)}
				</span>
			</div>

			<div className="flex items-center gap-2 text-foreground/60 text-xs">
				{hasWhatsApp ? (
					<>
						<PhoneIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
						<span className="truncate">
							{whatsappInstanceName ?? "WhatsApp vinculado"}
						</span>
					</>
				) : (
					<>
						<PhoneOffIcon className="size-3.5" />
						<span>Sem WhatsApp</span>
					</>
				)}
			</div>

			<span className="mt-auto text-[10px] text-foreground/40 uppercase tracking-wider">
				v{agent.version}
			</span>
		</Link>
	);
}
