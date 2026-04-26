import { cn } from "@ui/lib";
import { ChartLineIcon, MessageSquareIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import {
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

const ROLE_DOT_COLOR: Record<TeamMemberRole, string> = {
	SUPERVISOR: "bg-lime-400",
	ANALYST: "bg-cyan-400",
	CAMPAIGNS: "bg-orange-400",
	ASSISTANT: "bg-violet-400",
};

const STATUS_TINT: Record<TeamWithMembers["status"], string> = {
	DRAFT: "bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.10),rgba(99,102,241,0.02)_60%,transparent)]",
	ACTIVE: "bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.12),rgba(34,197,94,0.02)_60%,transparent)]",
	SANDBOX: "bg-[radial-gradient(ellipse_at_top,rgba(234,179,8,0.10),rgba(234,179,8,0.02)_60%,transparent)]",
	PAUSED: "bg-[radial-gradient(ellipse_at_top,rgba(113,113,122,0.08),transparent_60%)]",
	ARCHIVED: "bg-[radial-gradient(ellipse_at_top,rgba(82,82,91,0.06),transparent_60%)]",
};

export function TeamCard({ team, organizationSlug }: Props) {
	const detailHref = `/app/${organizationSlug}/ai-studio/teams/${team.id}`;
	const memberRoles = new Set(team.members.map((m) => m.role));
	const brandName = (team.brandVoice as { name?: string })?.name;
	const metrics = team.metrics ?? {};

	return (
		<Link
			href={detailHref}
			className={cn(
				"group relative isolate flex flex-col overflow-hidden rounded-xl bg-zinc-900 transition-all",
				"shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8),0_4px_12px_-6px_rgba(0,0,0,0.4)]",
				"hover:-translate-y-0.5 hover:shadow-[0_28px_50px_-20px_rgba(0,0,0,1),0_8px_18px_-8px_rgba(0,0,0,0.5)]",
			)}
		>
			{/* Status tint glow no header */}
			<div
				className={cn(
					"pointer-events-none absolute inset-x-0 top-0 z-0 h-24",
					STATUS_TINT[team.status],
				)}
			/>

			<div className="relative z-10 flex flex-col gap-3 px-4 pt-4">
				<div className="flex items-center justify-between gap-2">
					<TeamStatusBadge status={team.status} />
					<div className="flex items-center gap-1">
						{ROLE_DOT_ORDER.map((role) => (
							<span
								key={role}
								className={cn(
									"size-1.5 rounded-full transition-opacity",
									memberRoles.has(role)
										? ROLE_DOT_COLOR[role]
										: "bg-zinc-700/50",
								)}
								title={role}
							/>
						))}
					</div>
				</div>

				<div className="flex flex-col gap-0.5">
					<h3
						className="font-medium text-[15px] text-zinc-100 leading-tight tracking-tight"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						{team.name}
					</h3>
					<p className="text-[12px] text-zinc-500">
						{brandName ? `${brandName} · ${team.members.length}/4 papéis` : `${team.members.length}/4 papéis configurados`}
					</p>
				</div>
			</div>

			<div className="relative z-10 mt-auto flex items-center gap-4 border-zinc-800/60 border-t bg-black/20 px-4 py-2.5">
				<MetricChip
					icon={<MessageSquareIcon className="size-3" />}
					value={String(metrics.leadsAttendedToday ?? 0)}
					label="hoje"
				/>
				<MetricChip
					icon={<ChartLineIcon className="size-3" />}
					value={
						metrics.qualificationRateLast7d != null
							? `${Math.round(metrics.qualificationRateLast7d * 100)}%`
							: "—"
					}
					label="qualif."
				/>
				<MetricChip
					icon={<UserRoundIcon className="size-3" />}
					value={String(metrics.humanHandoffsLast7d ?? 0)}
					label="handoffs"
				/>
			</div>
		</Link>
	);
}

function MetricChip({
	icon,
	value,
	label,
}: {
	icon: React.ReactNode;
	value: string;
	label: string;
}) {
	return (
		<span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
			<span className="text-zinc-600">{icon}</span>
			<span className="font-medium tabular-nums text-zinc-300">{value}</span>
			<span className="text-zinc-600">{label}</span>
		</span>
	);
}
