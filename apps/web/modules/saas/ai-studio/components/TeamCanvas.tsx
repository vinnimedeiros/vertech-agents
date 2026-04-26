"use client";

import { cn } from "@ui/lib";
import {
	BookOpenIcon,
	BotIcon,
	BrainIcon,
	HelpCircleIcon,
	LinkIcon,
	MoreHorizontalIcon,
	RocketIcon,
	SparklesIcon,
	UsersRoundIcon,
	WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import {
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
	SUPERVISOR: "Supervisor do TIME — fala com lead, coordena especialistas.",
	ANALYST: "Inteligência comercial. Lê pipeline, gera relatórios e propõe ações estratégicas.",
	CAMPAIGNS: "Disparos em massa controlados. Executa campanhas após aprovação humana.",
	ASSISTANT: "Ponte com equipe humana. Notifica via grupo WhatsApp em handoffs e situações sensíveis.",
};

const SUB_DELEGATE: Record<TeamMemberRole, string> = {
	SUPERVISOR: "",
	ANALYST: "Delegue para análise de pipeline, relatórios estratégicos ou recomendações de campanha.",
	CAMPAIGNS: "Delegue para disparar campanhas aprovadas em massa com controle anti-bloqueio.",
	ASSISTANT: "Delegue para escalar para equipe humana ou notificar em situações sensíveis.",
};

type RoleTheme = {
	tint: string;
	dot: string;
	icon: string;
	iconBg: string;
};

const ROLE_THEMES: Record<TeamMemberRole, RoleTheme> = {
	SUPERVISOR: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(163,230,53,0.15),rgba(163,230,53,0.04)_60%,transparent)]",
		dot: "bg-lime-400",
		icon: "text-lime-300",
		iconBg: "bg-lime-500/15 ring-1 ring-lime-400/30",
	},
	ANALYST: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.18),rgba(34,211,238,0.04)_60%,transparent)]",
		dot: "bg-cyan-400",
		icon: "text-cyan-300",
		iconBg: "bg-cyan-500/15 ring-1 ring-cyan-400/30",
	},
	CAMPAIGNS: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.18),rgba(251,146,60,0.04)_60%,transparent)]",
		dot: "bg-orange-400",
		icon: "text-orange-300",
		iconBg: "bg-orange-500/15 ring-1 ring-orange-400/30",
	},
	ASSISTANT: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.18),rgba(167,139,250,0.04)_60%,transparent)]",
		dot: "bg-violet-400",
		icon: "text-violet-300",
		iconBg: "bg-violet-500/15 ring-1 ring-violet-400/30",
	},
};

const ROLE_ICON: Record<TeamMemberRole, typeof SparklesIcon> = {
	SUPERVISOR: SparklesIcon,
	ANALYST: BrainIcon,
	CAMPAIGNS: RocketIcon,
	ASSISTANT: UsersRoundIcon,
};

export function TeamCanvas({ team, organizationSlug }: Props) {
	const supervisor = team.members.find((m) => m.role === "SUPERVISOR");
	const subAgents = team.members.filter((m) => m.role !== "SUPERVISOR");
	const subAgentsByRole = new Map(subAgents.map((m) => [m.role, m]));

	return (
		<div className="relative isolate flex min-h-[640px] flex-1 flex-col items-center overflow-hidden rounded-2xl bg-zinc-950">
			<DotGrid />

			<div className="relative z-20 flex w-full flex-col items-center px-8 pt-14 pb-14">
				{/* Supervisor */}
				<div className="flex justify-center">
					{supervisor ? (
						<SupervisorCard
							member={supervisor}
							organizationSlug={organizationSlug}
							teamId={team.id}
						/>
					) : (
						<EmptySupervisor />
					)}
				</div>

				{/* Cards container — width fixo pra SVG alinhar com cards */}
				<div className="relative w-full max-w-[900px]">
					{/* SVG ocupa só o gap entre supervisor e cards row */}
					<div className="relative h-32 w-full">
						<ConnectionLines />
					</div>

					{/* Sub-agents row — V3: 3 papéis fixos (Analista, Campanhas, Assistente) */}
					<div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{SUB_ROLES.map((role) => {
							const member = subAgentsByRole.get(role);
							if (member) {
								return (
									<MemberCard
										key={role}
										member={member}
										role={role}
										organizationSlug={organizationSlug}
										teamId={team.id}
									/>
								);
							}
							return <EmptyMemberCard key={role} role={role} />;
						})}
					</div>
				</div>
			</div>
		</div>
	);
}

function DotGrid() {
	return (
		<div
			aria-hidden
			className="absolute inset-0 z-0 opacity-50"
			style={{
				backgroundImage:
					"radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
				backgroundSize: "24px 24px",
			}}
		/>
	);
}

function ConnectionLines() {
	/*
	 * SVG cobre o gap (h-32 = 128px) entre supervisor e cards row, alinhado
	 * com o cards container (max-w-900). ViewBox 1000x100, preserveAspectRatio
	 * none estica em ambos eixos.
	 *
	 * Endpoints x dos cards (3 colunas iguais em max-w-900):
	 *   - Card 1 (Analista): centro 1/6 do container = 167
	 *   - Card 2 (Campanhas): centro 3/6 = 500
	 *   - Card 3 (Assistente): centro 5/6 = 833
	 *
	 * Saída supervisor: x=500 (centro do SVG = centro do cards container,
	 * que coincide com centro horizontal da tela). Spread sutil 488/500/512
	 * pros 3 paths não saírem do mesmo ponto.
	 */
	return (
		<svg
			aria-hidden
			className="pointer-events-none absolute inset-0 z-0 size-full"
			preserveAspectRatio="none"
			viewBox="0 0 1000 100"
		>
			<g
				stroke="rgba(255,255,255,0.35)"
				strokeWidth="1.5"
				strokeDasharray="4 5"
				strokeLinecap="round"
				fill="none"
				vectorEffect="non-scaling-stroke"
			>
				<path d="M 488 0 C 488 50, 167 50, 167 100" />
				<path d="M 500 0 L 500 100" />
				<path d="M 512 0 C 512 50, 833 50, 833 100" />
			</g>
			<g fill="rgba(255,255,255,0.6)">
				<circle cx="500" cy="0" r="3" />
				<circle cx="167" cy="100" r="3" />
				<circle cx="500" cy="100" r="3" />
				<circle cx="833" cy="100" r="3" />
			</g>
		</svg>
	);
}

function CardShell({
	role,
	children,
	href,
	className,
}: {
	role: TeamMemberRole;
	children: React.ReactNode;
	href?: string;
	className?: string;
}) {
	const theme = ROLE_THEMES[role];
	const baseClass = cn(
		"group relative isolate overflow-hidden rounded-2xl bg-zinc-900 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9),0_8px_24px_-12px_rgba(0,0,0,0.6)] transition-all",
		"hover:-translate-y-0.5 hover:shadow-[0_40px_70px_-30px_rgba(0,0,0,1),0_16px_32px_-16px_rgba(0,0,0,0.7)]",
		className,
	);

	const content = (
		<>
			<div className={cn("pointer-events-none absolute inset-x-0 top-0 z-0 h-32", theme.tint)} />
			<div className="relative z-10 flex flex-col">{children}</div>
		</>
	);

	if (href) {
		return (
			<Link href={href} className={baseClass}>
				{content}
			</Link>
		);
	}
	return <div className={baseClass}>{content}</div>;
}

function CardHeader({
	role,
	name,
	subtitle,
	avatarFallback,
}: {
	role: TeamMemberRole;
	name: string;
	subtitle?: string;
	avatarFallback?: string;
}) {
	const theme = ROLE_THEMES[role];
	const Icon = ROLE_ICON[role];

	return (
		<div className="flex items-center gap-3 px-5 pt-5 pb-3">
			<div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", theme.iconBg)}>
				{avatarFallback ? (
					<span className={cn("font-semibold text-xs", theme.icon)}>{avatarFallback}</span>
				) : (
					<Icon className={cn("size-4", theme.icon)} />
				)}
			</div>
			<div className="min-w-0 flex-1">
				<h4 className="truncate font-semibold text-[15px] text-white tracking-tight">
					{name}
				</h4>
				{subtitle ? (
					<p className="truncate text-[11px] text-zinc-400 uppercase tracking-wider">
						{subtitle}
					</p>
				) : null}
			</div>
			<button
				type="button"
				onClick={(e) => e.preventDefault()}
				className="flex size-7 items-center justify-center rounded-md text-zinc-500 opacity-0 transition-all hover:bg-white/5 hover:text-zinc-200 group-hover:opacity-100"
			>
				<MoreHorizontalIcon className="size-4" />
			</button>
		</div>
	);
}

function CardSection({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1.5 px-5 py-2.5">
			<span className="font-medium text-[10px] text-zinc-500 uppercase tracking-[0.12em]">
				{label}
			</span>
			<p className="line-clamp-3 text-[12.5px] text-zinc-300 leading-relaxed">
				{children}
			</p>
		</div>
	);
}

function CardFooter({ counts }: { counts: { tools: number; mcp: number; docs: number; links: number; faq: number } }) {
	return (
		<div className="mt-auto flex items-center gap-3.5 border-zinc-800/60 border-t bg-black/20 px-5 py-3">
			<FooterChip icon={<WrenchIcon className="size-3" />} value={counts.tools} />
			<FooterChip icon={<span className="font-mono text-[8px]">MCP</span>} value={counts.mcp} />
			<FooterChip icon={<BookOpenIcon className="size-3" />} value={counts.docs} />
			<FooterChip icon={<LinkIcon className="size-3" />} value={counts.links} />
			<FooterChip icon={<HelpCircleIcon className="size-3" />} value={counts.faq} />
		</div>
	);
}

function FooterChip({ icon, value }: { icon: React.ReactNode; value: number }) {
	return (
		<span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
			<span className="text-zinc-400">{icon}</span>
			<span className="font-medium tabular-nums text-zinc-300">{value}</span>
		</span>
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
	const initials = member.agent.name
		.split(/\s+/)
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
	const tools = member.agent.enabledTools?.length ?? 0;
	const docs = member.agent.knowledgeDocIds?.length ?? 0;

	return (
		<CardShell role="SUPERVISOR" href={detailHref} className="w-[360px]">
			<CardHeader
				role="SUPERVISOR"
				name={member.agent.name}
				subtitle="Supervisor do TIME"
				avatarFallback={initials}
			/>
			<CardSection label="Instruction">
				{member.bio || member.agent.description || "Atendente comercial. Coordena o TIME, fala com lead via WhatsApp e delega para especialistas."}
			</CardSection>
			<CardFooter
				counts={{ tools, mcp: 0, docs, links: 0, faq: 0 }}
			/>
		</CardShell>
	);
}

function MemberCard({
	member,
	role,
	organizationSlug,
	teamId,
}: {
	member: TeamWithMembers["members"][number];
	role: TeamMemberRole;
	organizationSlug: string;
	teamId: string;
}) {
	const detailHref = `/app/${organizationSlug}/ai-studio/teams/${teamId}/agents/${member.agentId}`;
	const tools = member.agent.enabledTools?.length ?? 0;
	const docs = member.agent.knowledgeDocIds?.length ?? 0;

	return (
		<CardShell role={role} href={detailHref}>
			<CardHeader role={role} name={member.agent.name} subtitle={ROLE_LABELS[role]} />
			<CardSection label="Delegate instruction">
				{member.delegateInstruction || SUB_DELEGATE[role]}
			</CardSection>
			<CardSection label="Bio">
				{member.bio || member.agent.description || SUB_BIOS[role]}
			</CardSection>
			<CardFooter counts={{ tools, mcp: 0, docs, links: 0, faq: 0 }} />
		</CardShell>
	);
}

function EmptySupervisor() {
	const theme = ROLE_THEMES.SUPERVISOR;
	return (
		<div className="relative isolate flex w-[360px] flex-col items-center gap-3 overflow-hidden rounded-2xl bg-zinc-900 px-6 py-8 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
			<div className={cn("pointer-events-none absolute inset-x-0 top-0 z-0 h-32", theme.tint)} />
			<div className={cn("relative z-10 flex size-12 items-center justify-center rounded-xl", theme.iconBg)}>
				<SparklesIcon className={cn("size-5", theme.icon)} />
			</div>
			<div className="relative z-10 flex flex-col items-center gap-1 text-center">
				<h4 className="font-semibold text-sm text-white">Supervisor não configurado</h4>
				<p className="text-xs text-zinc-400">Defina o Atendente líder do TIME.</p>
			</div>
		</div>
	);
}

function EmptyMemberCard({ role }: { role: TeamMemberRole }) {
	const theme = ROLE_THEMES[role];
	const Icon = ROLE_ICON[role];

	return (
		<div className="relative isolate flex flex-col gap-3 overflow-hidden rounded-2xl bg-zinc-900 px-5 py-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_20px_40px_-20px_rgba(0,0,0,0.8)]">
			<div className={cn("pointer-events-none absolute inset-x-0 top-0 z-0 h-24 opacity-50", theme.tint)} />
			<div className="relative z-10 flex items-center gap-2.5">
				<div className={cn("flex size-9 items-center justify-center rounded-lg opacity-60", theme.iconBg)}>
					<Icon className={cn("size-4", theme.icon)} />
				</div>
				<div className="flex flex-col">
					<span className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.12em]">
						{ROLE_LABELS[role]}
					</span>
					<span className="font-medium text-[13px] text-zinc-400">Não configurado</span>
				</div>
			</div>
			<p className="relative z-10 line-clamp-3 text-xs text-zinc-500 leading-relaxed">
				{SUB_BIOS[role]}
			</p>
			<div className="relative z-10 mt-auto flex items-center gap-1.5 text-[10px] text-zinc-600 uppercase tracking-wider">
				<BotIcon className="size-3" />
				Aguardando setup
			</div>
		</div>
	);
}

