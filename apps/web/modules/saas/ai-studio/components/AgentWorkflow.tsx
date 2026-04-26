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
	BrainIcon,
	type LucideIcon,
	MessageSquareIcon,
	SendHorizontalIcon,
	SparklesIcon,
	WrenchIcon,
	ZapIcon,
} from "lucide-react";
import { useCallback } from "react";

type NodeData = {
	label: string;
	subtitle?: string;
	icon: LucideIcon;
	color: "lime" | "cyan" | "violet" | "orange" | "amber" | "rose";
	tools?: string[];
	locked?: boolean;
	onSelect?: (nodeId: string) => void;
};

type AgentRecord = {
	id: string;
	name: string;
	model: string;
	enabledTools: string[] | null;
	knowledgeDocIds: string[] | null;
};

const COLOR_MAP: Record<NonNullable<NodeData["color"]>, {
	tint: string;
	icon: string;
	iconBg: string;
	dot: string;
}> = {
	lime: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(163,230,53,0.18),rgba(163,230,53,0.04)_60%,transparent)]",
		icon: "text-lime-300",
		iconBg: "bg-lime-500/15 ring-1 ring-lime-400/30",
		dot: "bg-lime-400",
	},
	cyan: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.18),rgba(34,211,238,0.04)_60%,transparent)]",
		icon: "text-cyan-300",
		iconBg: "bg-cyan-500/15 ring-1 ring-cyan-400/30",
		dot: "bg-cyan-400",
	},
	violet: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.18),rgba(167,139,250,0.04)_60%,transparent)]",
		icon: "text-violet-300",
		iconBg: "bg-violet-500/15 ring-1 ring-violet-400/30",
		dot: "bg-violet-400",
	},
	orange: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.18),rgba(251,146,60,0.04)_60%,transparent)]",
		icon: "text-orange-300",
		iconBg: "bg-orange-500/15 ring-1 ring-orange-400/30",
		dot: "bg-orange-400",
	},
	amber: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.18),rgba(251,191,36,0.04)_60%,transparent)]",
		icon: "text-amber-300",
		iconBg: "bg-amber-500/15 ring-1 ring-amber-400/30",
		dot: "bg-amber-400",
	},
	rose: {
		tint: "bg-[radial-gradient(ellipse_at_top,rgba(251,113,133,0.18),rgba(251,113,133,0.04)_60%,transparent)]",
		icon: "text-rose-300",
		iconBg: "bg-rose-500/15 ring-1 ring-rose-400/30",
		dot: "bg-rose-400",
	},
};

function StandardNode({ data, selected }: NodeProps<Node<NodeData>>) {
	const theme = COLOR_MAP[data.color];
	const Icon = data.icon;

	return (
		<div
			className={cn(
				"relative isolate w-[220px] overflow-hidden rounded-xl bg-zinc-900",
				"shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8),0_4px_12px_-6px_rgba(0,0,0,0.4)]",
				"transition-all",
				selected ? "ring-2 ring-primary/70" : "ring-1 ring-white/5",
			)}
		>
			<div className={cn("pointer-events-none absolute inset-x-0 top-0 z-0 h-20", theme.tint)} />

			<Handle
				type="target"
				position={Position.Left}
				className="!size-2 !border-0 !bg-zinc-600"
			/>
			<Handle
				type="source"
				position={Position.Right}
				className="!size-2 !border-0 !bg-zinc-600"
			/>

			<div className="relative z-10 flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5">
				<div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", theme.iconBg)}>
					<Icon className={cn("size-3.5", theme.icon)} />
				</div>
				<div className="min-w-0 flex-1">
					<div
						className="truncate font-medium text-[13px] text-white"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						{data.label}
					</div>
					{data.subtitle ? (
						<div className="truncate text-[10px] text-zinc-500 uppercase tracking-wider">
							{data.subtitle}
						</div>
					) : null}
				</div>
				{data.locked ? (
					<span className="font-mono text-[9px] text-zinc-600 uppercase tracking-wider">
						lock
					</span>
				) : null}
			</div>

			{data.tools && data.tools.length > 0 ? (
				<div className="relative z-10 flex flex-col gap-0.5 border-zinc-800/60 border-t bg-black/20 px-3.5 py-2">
					{data.tools.slice(0, 4).map((t) => (
						<div
							key={t}
							className="flex items-center gap-1.5 text-[11px] text-zinc-400"
						>
							<span className={cn("size-1 rounded-full", theme.dot)} />
							<span className="truncate font-mono">{t}</span>
						</div>
					))}
					{data.tools.length > 4 ? (
						<div className="text-[10px] text-zinc-600">
							+{data.tools.length - 4} mais
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
}

const NODE_TYPES: NodeTypes = {
	standard: StandardNode,
};

function buildNodes(agent: AgentRecord, onSelect: (id: string) => void): Node<NodeData>[] {
	const tools = agent.enabledTools ?? [];
	const docs = agent.knowledgeDocIds?.length ?? 0;

	return [
		{
			id: "trigger",
			type: "standard",
			position: { x: 0, y: 120 },
			data: {
				label: "Mensagem WhatsApp",
				subtitle: "Trigger",
				icon: ZapIcon,
				color: "amber",
				locked: true,
				onSelect,
			},
		},
		{
			id: "memory",
			type: "standard",
			position: { x: 280, y: 0 },
			data: {
				label: "Memória",
				subtitle: "Working + Recall",
				icon: BrainIcon,
				color: "violet",
				onSelect,
			},
		},
		{
			id: "knowledge",
			type: "standard",
			position: { x: 280, y: 240 },
			data: {
				label: "Knowledge (RAG)",
				subtitle: `${docs} docs`,
				icon: MessageSquareIcon,
				color: "cyan",
				onSelect,
			},
		},
		{
			id: "llm",
			type: "standard",
			position: { x: 560, y: 120 },
			data: {
				label: agent.name,
				subtitle: agent.model,
				icon: SparklesIcon,
				color: "lime",
				onSelect,
			},
		},
		{
			id: "tools",
			type: "standard",
			position: { x: 840, y: 120 },
			data: {
				label: "Ferramentas",
				subtitle: `${tools.length} habilitadas`,
				icon: WrenchIcon,
				color: "orange",
				tools,
				onSelect,
			},
		},
		{
			id: "output",
			type: "standard",
			position: { x: 1120, y: 120 },
			data: {
				label: "Resposta WhatsApp",
				subtitle: "Output",
				icon: SendHorizontalIcon,
				color: "rose",
				locked: true,
				onSelect,
			},
		},
	];
}

const EDGES: Edge[] = [
	{ id: "e1", source: "trigger", target: "memory", animated: true },
	{ id: "e2", source: "trigger", target: "knowledge", animated: true },
	{ id: "e3", source: "memory", target: "llm" },
	{ id: "e4", source: "knowledge", target: "llm" },
	{ id: "e5", source: "llm", target: "tools" },
	{ id: "e6", source: "tools", target: "output" },
].map((e) => ({
	...e,
	type: "smoothstep",
	style: {
		stroke: "color-mix(in srgb, currentColor 40%, transparent)",
		strokeWidth: 1.2,
		strokeDasharray: "4 5",
	},
}));

type Props = {
	agent: AgentRecord;
	onNodeSelect?: (nodeId: string) => void;
};

export function AgentWorkflow({ agent, onNodeSelect }: Props) {
	const handleSelect = useCallback(
		(id: string) => onNodeSelect?.(id),
		[onNodeSelect],
	);
	const initialNodes = buildNodes(agent, handleSelect);
	const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, _setEdges, onEdgesChange] = useEdgesState(EDGES);

	const handleNodeClick = useCallback(
		(_e: React.MouseEvent, node: Node) => {
			handleSelect(node.id);
		},
		[handleSelect],
	);

	return (
		<ReactFlowProvider>
			<div className="size-full text-foreground">
				<ReactFlow
					nodes={nodes}
					edges={edges}
					nodeTypes={NODE_TYPES}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onNodeClick={handleNodeClick}
					fitView
					fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
					minZoom={0.3}
					maxZoom={2}
					proOptions={{ hideAttribution: true }}
					nodesConnectable={false}
					nodesDraggable
					panOnDrag
					selectionOnDrag={false}
					zoomOnScroll
					zoomOnPinch
					zoomOnDoubleClick={false}
					className="!bg-transparent"
				/>
			</div>
		</ReactFlowProvider>
	);
}
