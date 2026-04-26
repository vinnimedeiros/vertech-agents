"use client";

import { cn } from "@ui/lib";
import { PlusIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import {
	ROLE_COLORS,
	ROLE_LABELS,
	type TeamMemberRole,
	type TeamWithMembers,
} from "../lib/types";

type Props = {
	team: TeamWithMembers;
	organizationSlug: string;
};

const SUB_ROLES: TeamMemberRole[] = ["ANALYST", "CAMPAIGNS", "ASSISTANT"];

const SUB_BIOS: Record<TeamMemberRole, string> = {
	SUPERVISOR: "",
	ANALYST: "Inteligência comercial. Lê pipeline e propõe ações.",
	CAMPAIGNS: "Disparos em massa controlados. Executa após aprovação.",
	ASSISTANT: "Ponte com equipe humana via grupo WhatsApp.",
};

export function TeamCanvas({ team, organizationSlug }: Props) {
	const supervisor = team.members.find((m) => m.role === "SUPERVISOR");
	const subAgents = team.members.filter((m) => m.role !== "SUPERVISOR");
	const subAgentsByRole = new Map(subAgents.map((m) => [m.role, m]));

	return (
		<div className="relative flex flex-1 flex-col items-center gap-12 overflow-x-auto rounded-xl border border-border bg-[radial-gradient(circle_at_50%_0%,rgba(163,230,53,0.04)_0%,transparent_50%)] bg-card/30 p-8 lg:p-12">
			{/* Supervisor (Atendente) */}
			{supervisor ? (
				<SupervisorCard
					member={supervisor}
					organizationSlug={organizationSlug}
					teamId={team.id}
				/>
			) : (
				<EmptySlot
					label="Atendente (Supervisor)"
					description="Configure o agente líder do TIME."
					strong
				/>
			)}

			{/* Connection lines (SVG) */}
			<svg
				aria-hidden
				className="pointer-events-none absolute top-[140px] left-1/2 h-32 w-[80%] -translate-x-1/2"
				viewBox="0 0 800 140"
				preserveAspectRatio="none"
			>
				<line x1="400" y1="0" x2="100" y2="140" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-border" />
				<line x1="400" y1="0" x2="400" y2="140" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-border" />
				<line x1="400" y1="0" x2="700" y2="140" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-border" />
			</svg>

			{/* Sub-agents fan-out */}
			<div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
				{SUB_ROLES.map((role) => {
					const member = subAgentsByRole.get(role);
					if (member) {
						return (
							<MemberCard
								key={role}
								member={member}
								organizationSlug={organizationSlug}
								teamId={team.id}
							/>
						);
					}
					return (
						<EmptySlot
							key={role}
							label={ROLE_LABELS[role]}
							description={SUB_BIOS[role]}
							role={role}
						/>
					);
				})}
			</div>

			{/* Add new agent slot (V4+) */}
			<button
				type="button"
				disabled
				title="Disponível em versão futura"
				className="flex items-center gap-2 rounded-lg border border-border border-dashed bg-card/30 px-4 py-2.5 text-muted-foreground/60 text-xs opacity-60"
			>
				<PlusIcon className="size-3.5" />
				Adicionar agente customizado (V4+)
			</button>
		</div>
	);
}

function SupervisorCard({
	member,
	organizationSlug,
	teamId,
}: {
	member: TeamWithMembers["members"][number];
	organizationSlug: string;
	teamId: string;
}) {
	const detailHref = `/app/${organizationSlug}/ai-studio/teams/${teamId}/agents/${member.agentId}`;
	return (
		<Link
			href={detailHref}
			className={cn(
				"group relative flex w-[340px] flex-col gap-3 rounded-xl border-2 bg-card p-5 shadow-lg transition-all",
				ROLE_COLORS.SUPERVISOR.replace("text-", "border-").replace("bg-", "shadow-"),
				"hover:scale-[1.02] hover:border-lime-400",
			)}
		>
			<div className="flex items-center gap-2">
				<span className={cn("flex size-8 items-center justify-center rounded-md", ROLE_COLORS.SUPERVISOR)}>
					<SparklesIcon className="size-4" />
				</span>
				<div className="flex flex-col">
					<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
						Supervisor do TIME
					</span>
					<span className="font-semibold text-foreground text-sm">
						{member.agent.name}
					</span>
				</div>
			</div>
			<p className="line-clamp-2 text-muted-foreground text-xs">
				{member.bio || member.agent.description || "Atendente comercial humanizado, foca em qualificação e conversão."}
			</p>
			<div className="flex items-center gap-3 border-border/50 border-t pt-2 text-[10px] text-muted-foreground uppercase tracking-wider">
				<span>🔧 {member.agent.enabledTools?.length ?? 0}</span>
				<span>📚 {member.agent.knowledgeDocIds?.length ?? 0}</span>
				<span className="ml-auto">Editar →</span>
			</div>
		</Link>
	);
}

function MemberCard({
	member,
	organizationSlug,
	teamId,
}: {
	member: TeamWithMembers["members"][number];
	organizationSlug: string;
	teamId: string;
}) {
	const detailHref = `/app/${organizationSlug}/ai-studio/teams/${teamId}/agents/${member.agentId}`;
	const colorClass = ROLE_COLORS[member.role];
	return (
		<Link
			href={detailHref}
			className={cn(
				"group flex flex-col gap-2.5 rounded-lg border bg-card p-4 transition-all hover:scale-[1.02]",
				colorClass.replace("text-", "border-").split(" ")[0],
			)}
		>
			<div className="flex items-center gap-2">
				<span className={cn("size-2 rounded-full", colorClass.split(" ").find((c) => c.startsWith("bg-")))} />
				<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
					{ROLE_LABELS[member.role]}
				</span>
			</div>
			<h4 className="font-semibold text-foreground text-sm">
				{member.agent.name}
			</h4>
			<p className="line-clamp-3 text-muted-foreground text-xs">
				{member.bio || member.agent.description || SUB_BIOS[member.role]}
			</p>
			<div className="flex items-center gap-3 border-border/50 border-t pt-2 text-[10px] text-muted-foreground uppercase tracking-wider">
				<span>🔧 {member.agent.enabledTools?.length ?? 0}</span>
				<span className="ml-auto">Editar →</span>
			</div>
		</Link>
	);
}

function EmptySlot({
	label,
	description,
	role,
	strong,
}: {
	label: string;
	description: string;
	role?: TeamMemberRole;
	strong?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex flex-col gap-2.5 rounded-lg border border-border border-dashed bg-card/30 p-4 text-center",
				strong && "w-[340px]",
			)}
		>
			<span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-wider">
				{label}
			</span>
			<span className="text-muted-foreground/70 text-xs">{description}</span>
			<button
				type="button"
				disabled
				title="Disponível após M2-03/04/05"
				className="mt-2 rounded-md border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground/50 uppercase tracking-wider"
			>
				Aguardando setup
			</button>
		</div>
	);
}
