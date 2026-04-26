"use client";

import {
	type Edge,
	Handle,
	type Node,
	type NodeProps,
	type NodeTypes,
	Position,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@ui/lib";
import {
	BookOpenIcon,
	BrainIcon,
	HelpCircleIcon,
	LinkIcon,
	type LucideIcon,
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

const SUB_BIOS: Record<TeamMemberRole, string> = {
	SUPERVISOR: "Supervisor do TIME — fala com lead, coordena especialistas.",
	ANALYST:
		"Inteligência comercial. Lê pipeline, gera relatórios e propõe ações.",
	CAMPAIGNS:
		"Disparos em massa controlados. Executa campanhas após aprovação.",
	ASSISTANT:
		"Ponte com equipe humana. Notifica via grupo WhatsApp em handoffs.",
};

const SUB_DELEGATE: Record<TeamMemberRole, string> = {
	SUPERVISOR: "",
	ANALYST: "Delegue para análise estratégica e relatórios.",
	CAMPAIGNS: "Delegue para disparar campanhas aprovadas.",
	ASSISTANT: "Delegue para escalar para equipe humana.",
};

const ROLE_ICON: Record<TeamMemberRole, LucideIcon> = {
	SUPERVISOR: SparklesIcon,
	ANALYST: BrainIcon,
	CAMPAIGNS: RocketIcon,
	ASSISTANT: UsersRoundIcon,
};

const ROLE_THEMES: Record<TeamMemberRole, {
	tint: string;
	icon: string;
	iconBg: string;
	dot: string;
}> = {
	SUPERVISOR: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(163,230,53,0.18),rgba(163,230,53,0.04)_60%,transparent)]",
		icon: "text-lime-300",
		iconBg: "bg-lime-500/15 ring-1 ring-lime-400/30",
		dot: "bg-lime-400",
	},
	ANALYST: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.18),rgba(34,211,238,0.04)_60%,transparent)]",
		icon: "text-cyan-300",
		iconBg: "bg-cyan-500/15 ring-1 ring-cyan-400/30",
		dot: "bg-cyan-400",
	},
	CAMPAIGNS: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.18),rgba(251,146,60,0.04)_60%,transparent)]",
		icon: "text-orange-300",
		iconBg: "bg-orange-500/15 ring-1 ring-orange-400/30",
		dot: "bg-orange-400",
	},
	ASSISTANT: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.18),rgba(167,139,250,0.04)_60%,transparent)]",
		icon: "text-violet-300",
		iconBg: "bg-violet-500/15 ring-1 ring-violet-400/30",
		dot: "bg-violet-400",
	},
};

type MemberNodeData = {
	role: TeamMemberRole;
	name: string;
	bio: string;
	delegateInstruction: string;
	tools: number;
	docs: number;
	href: string;
	isSupervisor?: boolean;
	empty?: boolean;
};

function MemberNode({ data, selected }: NodeProps<Node<MemberNodeData>>) {
	const theme = ROLE_THEMES[data.role];
	const Icon = ROLE_ICON[data.role];
	const isSupervisor = data.isSupervisor ?? false;
	const isEmpty = data.empty ?? false;

	const card = (
		<div
			className={cn(
				"relative isolate overflow-hidden rounded-xl bg-zinc-900",
				"shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8),0_4px_12px_-6px_rgba(0,0,0,0.4)]",
				"transition-all",
				isSupervisor ? "w-[300px]" : "w-[240px]",
				selected ? "ring-2 ring-primary/70" : "ring-1 ring-white/5",
				isEmpty && "opacity-70",
			)}
		>
			<div
				className={cn(
					"pointer-events-none absolute inset-x-0 top-0 z-0",
					isSupervisor ? "h-24" : "h-20",
					theme.tint,
				)}
			/>

			{isSupervisor ? (
				<Handle
					type="source"
					position={Position.Bottom}
					className="!size-2 !border-0 !bg-zinc-600"
				/>
			) : (
				<Handle
					type="target"
					position={Position.Top}
					className="!size-2 !border-0 !bg-zinc-600"
				/>
			)}

			{/* Header */}
			<div className="relative z-10 flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5">
				<div
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-md",
						theme.iconBg,
					)}
				>
					<Icon className={cn("size-3.5", theme.icon)} />
				</div>
				<div className="min-w-0 flex-1">
					<div
						className="truncate font-medium text-[13px] text-white"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						{isEmpty ? "Não configurado" : data.name}
					</div>
					<div className="truncate text-[10px] text-zinc-500 uppercase tracking-wider">
						{ROLE_LABELS[data.role]}
					</div>
				</div>
				{!isEmpty ? (
					<button
						type="button"
						className="flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
					>
						<MoreHorizontalIcon className="size-3.5" />
					</button>
				) : null}
			</div>

			{/* Body */}
			{!isSupervisor && data.delegateInstruction ? (
				<div className="relative z-10 flex flex-col gap-1 px-3.5 py-2">
					<div className="font-medium text-[9px] text-zinc-500 uppercase tracking-[0.12em]">
						Delegate instruction
					</div>
					<p className="line-clamp-2 text-[11.5px] text-zinc-300 leading-relaxed">
						{data.delegateInstruction}
					</p>
				</div>
			) : null}

			<div className="relative z-10 flex flex-col gap-1 px-3.5 py-2">
				<div className="font-medium text-[9px] text-zinc-500 uppercase tracking-[0.12em]">
					Bio
				</div>
				<p className="line-clamp-2 text-[11.5px] text-zinc-300 leading-relaxed">
					{data.bio}
				</p>
			</div>

			{/* Footer */}
			{!isEmpty ? (
				<div className="relative z-10 flex items-center gap-3 border-zinc-800/60 border-t bg-black/20 px-3.5 py-2">
					<FooterChip
						icon={<WrenchIcon className="size-3" />}
						value={data.tools}
					/>
					<FooterChip
						icon={<BookOpenIcon className="size-3" />}
						value={data.docs}
					/>
					<FooterChip
						icon={<LinkIcon className="size-3" />}
						value={0}
					/>
					<FooterChip
						icon={<HelpCircleIcon className="size-3" />}
						value={0}
					/>
				</div>
			) : (
				<div className="relative z-10 px-3.5 py-2 text-[10px] text-zinc-600 uppercase tracking-wider">
					Aguardando setup
				</div>
			)}
		</div>
	);

	if (data.href && !isEmpty) {
		return <Link href={data.href}>{card}</Link>;
	}
	return card;
}

function FooterChip({
	icon,
	value,
}: { icon: React.ReactNode; value: number }) {
	return (
		<span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
			<span className="text-zinc-400">{icon}</span>
			<span className="font-medium tabular-nums text-zinc-300">{value}</span>
		</span>
	);
}

const NODE_TYPES: NodeTypes = {
	member: MemberNode,
};

const SUB_ROLES: TeamMemberRole[] = ["ANALYST", "CAMPAIGNS", "ASSISTANT"];

function buildNodes(
	team: TeamWithMembers,
	organizationSlug: string,
): Node<MemberNodeData>[] {
	const supervisor = team.members.find((m) => m.role === "SUPERVISOR");
	const subAgentsByRole = new Map(
		team.members.filter((m) => m.role !== "SUPERVISOR").map((m) => [m.role, m]),
	);

	const nodes: Node<MemberNodeData>[] = [];

	// Supervisor centralizado no topo
	nodes.push({
		id: "supervisor",
		type: "member",
		position: { x: 380, y: 0 },
		data: supervisor
			? {
					role: "SUPERVISOR",
					name: supervisor.agent.name,
					bio:
						supervisor.bio ||
						supervisor.agent.description ||
						"Atendente comercial. Coordena o TIME e fala com lead via WhatsApp.",
					delegateInstruction: "",
					tools: supervisor.agent.enabledTools?.length ?? 0,
					docs: supervisor.agent.knowledgeDocIds?.length ?? 0,
					href: `/app/${organizationSlug}/ai-studio/teams/${team.id}/agents/${supervisor.agentId}`,
					isSupervisor: true,
				}
			: {
					role: "SUPERVISOR",
					name: "Supervisor não configurado",
					bio: "Defina o Atendente líder do TIME.",
					delegateInstruction: "",
					tools: 0,
					docs: 0,
					href: "",
					isSupervisor: true,
					empty: true,
				},
	});

	// Sub-agents alinhados embaixo
	const subY = 320;
	const xPositions = [60, 460, 860];
	SUB_ROLES.forEach((role, idx) => {
		const member = subAgentsByRole.get(role);
		nodes.push({
			id: `sub-${role}`,
			type: "member",
			position: { x: xPositions[idx], y: subY },
			data: member
				? {
						role,
						name: member.agent.name,
						bio: member.bio || member.agent.description || SUB_BIOS[role],
						delegateInstruction:
							member.delegateInstruction || SUB_DELEGATE[role],
						tools: member.agent.enabledTools?.length ?? 0,
						docs: member.agent.knowledgeDocIds?.length ?? 0,
						href: `/app/${organizationSlug}/ai-studio/teams/${team.id}/agents/${member.agentId}`,
					}
				: {
						role,
						name: "Não configurado",
						bio: SUB_BIOS[role],
						delegateInstruction: SUB_DELEGATE[role],
						tools: 0,
						docs: 0,
						href: "",
						empty: true,
					},
		});
	});

	return nodes;
}

const buildEdges = (): Edge[] =>
	SUB_ROLES.map((role) => ({
		id: `e-supervisor-${role}`,
		source: "supervisor",
		target: `sub-${role}`,
		type: "smoothstep",
		animated: false,
		style: {
			stroke: "color-mix(in srgb, currentColor 35%, transparent)",
			strokeWidth: 1.2,
			strokeDasharray: "4 5",
		},
	}));

export function TeamCanvas({ team, organizationSlug }: Props) {
	const initialNodes = buildNodes(team, organizationSlug);
	const initialEdges = buildEdges();
	const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

	return (
		<ReactFlowProvider>
			<div className="size-full min-h-[560px] text-foreground">
				<ReactFlow
					nodes={nodes}
					edges={edges}
					nodeTypes={NODE_TYPES}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					fitView
					fitViewOptions={{ padding: 0.18, maxZoom: 1.05 }}
					minZoom={0.3}
					maxZoom={1.5}
					proOptions={{ hideAttribution: true }}
					nodesConnectable={false}
					nodesDraggable
					panOnDrag
					zoomOnScroll
					zoomOnPinch
					zoomOnDoubleClick={false}
					className="!bg-transparent"
				/>
			</div>
		</ReactFlowProvider>
	);
}
