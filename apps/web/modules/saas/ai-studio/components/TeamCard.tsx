import { cn } from "@ui/lib";
import { ChartLineIcon, MessageSquareIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import {
	ROLE_COLORS,
	ROLE_LABELS,
	type TeamMemberRole,
	type TeamWithMembers,
} from "../lib/types";
import { TeamStatusBadge } from "./TeamStatusBadge";

type Props = {
	team: TeamWithMembers;
	organizationSlug: string;
};

const ROLE_DOT_ORDER: TeamMemberRole[] = [
	"SUPERVISOR",
	"ANALYST",
	"CAMPAIGNS",
	"ASSISTANT",
];

export function TeamCard({ team, organizationSlug }: Props) {
	const detailHref = `/app/${organizationSlug}/ai-studio/teams/${team.id}`;
	const supervisor = team.members.find(
		(m: TeamWithMembers["members"][number]) => m.role === "SUPERVISOR",
	);
	const memberRoles = new Set(
		team.members.map((m: TeamWithMembers["members"][number]) => m.role),
	);
	const brandName = (team.brandVoice as { name?: string })?.name;
	const metrics = team.metrics ?? {};

	return (
		<div
			className={cn(
				"group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-all",
				"hover:border-primary/50 hover:shadow-md",
			)}
		>
			<Link
				href={detailHref}
				aria-label={`Abrir Construtor de ${team.name}`}
				className="absolute inset-0 z-0 rounded-xl outline-hidden"
			/>

			<header className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
				<TeamStatusBadge status={team.status} />
			</header>

			<div className="pointer-events-none relative z-10 flex items-center gap-2">
				{ROLE_DOT_ORDER.map((role) => {
					const filled = memberRoles.has(role);
					return (
						<span
							key={role}
							className={cn(
								"size-2.5 rounded-full border",
								filled
									? ROLE_COLORS[role].replace("text-", "bg-").replace("border-", "border-")
									: "border-border bg-muted/30",
							)}
							title={`${ROLE_LABELS[role]}: ${filled ? "configurado" : "vazio"}`}
						/>
					);
				})}
				<span className="ml-1 text-muted-foreground text-xs">
					{team.members.length}/{ROLE_DOT_ORDER.length}
				</span>
			</div>

			<div className="pointer-events-none relative z-10 flex flex-col gap-1">
				<h3 className="font-semibold text-foreground text-lg leading-tight">
					{team.name}
				</h3>
				{brandName ? (
					<p className="text-muted-foreground text-sm">
						{brandName} {supervisor ? "(Atendente do TIME)" : ""}
					</p>
				) : (
					<p className="text-muted-foreground text-sm italic">
						Sem voz de marca configurada
					</p>
				)}
			</div>

			<div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-4 border-border/50 border-t pt-3 text-xs">
				<MetricChip
					icon={<MessageSquareIcon className="size-3.5" />}
					label={`${metrics.leadsAttendedToday ?? 0} leads hoje`}
				/>
				<MetricChip
					icon={<ChartLineIcon className="size-3.5" />}
					label={
						metrics.qualificationRateLast7d != null
							? `${Math.round(metrics.qualificationRateLast7d * 100)}% qualif.`
							: "— qualif."
					}
				/>
				<MetricChip
					icon={<UserIcon className="size-3.5" />}
					label={`${metrics.humanHandoffsLast7d ?? 0} handoffs`}
				/>
			</div>

			<span className="pointer-events-none relative z-10 mt-1 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
				Abrir Construtor →
			</span>
		</div>
	);
}

function MetricChip({ icon, label }: { icon: React.ReactNode; label: string }) {
	return (
		<span className="flex items-center gap-1.5 text-muted-foreground">
			{icon}
			<span className="font-medium text-foreground/80">{label}</span>
		</span>
	);
}
