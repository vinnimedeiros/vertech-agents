import { getModelLabel } from "@repo/ai/models";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { cn } from "@ui/lib";
import { PhoneIcon, PhoneOffIcon } from "lucide-react";
import Link from "next/link";
import { getAgentInitials, resolveAgentAvatarUrl } from "../lib/avatar-helpers";
import type { AgentListRow } from "../lib/server";
import { AgentCardActions } from "./AgentCardActions";
import { AgentStatusBadge } from "./AgentStatusBadge";

type Props = {
	agent: AgentListRow;
	organizationSlug: string;
	whatsappInstanceName?: string | null;
};

export function AgentCard({
	agent,
	organizationSlug,
	whatsappInstanceName,
}: Props) {
	const detailHref = `/app/${organizationSlug}/agents/${agent.id}`;
	const hasWhatsApp = !!agent.whatsappInstanceId;
	const avatarSrc = resolveAgentAvatarUrl(agent.avatarUrl);

	return (
		<div
			className={cn(
				"group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all",
				"hover:border-primary/50 hover:shadow-md",
				"focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
			)}
		>
			{/* Link cobre toda a área do card — fica atrás do conteúdo mas recebe clicks */}
			<Link
				href={detailHref}
				aria-label={`Ver detalhe de ${agent.name}`}
				className="absolute inset-0 z-0 rounded-xl outline-hidden"
			/>

			{/* Conteúdo visual — pointer-events-none pra não sequestrar clicks do Link */}
			<div className="pointer-events-none relative z-10 flex items-start gap-3">
				<Avatar className="size-12 shrink-0 rounded-lg">
					{avatarSrc ? (
						<AvatarImage
							src={avatarSrc}
							alt=""
							className="rounded-lg"
						/>
					) : null}
					<AvatarFallback className="rounded-lg bg-primary/10 text-primary">
						{getAgentInitials(agent.name)}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<h3 className="truncate font-semibold text-foreground text-sm">
						{agent.name}
					</h3>
					<p className="truncate text-foreground/60 text-xs">
						{agent.role || "Sem função definida"}
					</p>
				</div>
			</div>

			<div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-2">
				<AgentStatusBadge status={agent.status} />
				<span className="text-foreground/60 text-xs">
					{getModelLabel(agent.model)}
				</span>
			</div>

			<div className="pointer-events-none relative z-10 flex items-center gap-2 text-foreground/60 text-xs">
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

			<span className="pointer-events-none relative z-10 mt-auto text-[10px] text-foreground/40 uppercase tracking-wider">
				v{agent.version}
			</span>

			{/* Dropdown posicionado absolute sobre o Link — pointer-events-auto pra
			    receber clicks, z mais alto pra ficar acima de tudo */}
			<div className="absolute top-3 right-3 z-20">
				<AgentCardActions
					agentId={agent.id}
					agentName={agent.name}
					status={agent.status}
					organizationSlug={organizationSlug}
				/>
			</div>
		</div>
	);
}
