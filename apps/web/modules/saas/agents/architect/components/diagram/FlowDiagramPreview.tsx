"use client";

import "@xyflow/react/dist/style.css";

import Dagre from "@dagrejs/dagre";
import {
	Background,
	type Edge,
	type Node,
	Position,
	ReactFlow,
	ReactFlowProvider,
} from "@xyflow/react";
import { useMemo } from "react";
import {
	CAPABILITY_LABELS,
	type FinalSummaryContent,
} from "../../lib/artifact-types";

type Props = {
	finalSummary: FinalSummaryContent;
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 52;

/**
 * Preview visual read-only do agente a ser criado (story 09.9).
 *
 * Mostra estrutura "Agente → Capabilities" como flow chart estático.
 * Layout via Dagre top-down (TB). Todas interações desabilitadas —
 * é só visualização pro user confirmar antes de clicar CTA.
 *
 * Orquestrador + Tools folhas virão em Phase 10 (Orchestrator Agent),
 * por ora só mostramos o agente + suas capabilities.
 */
export function FlowDiagramPreview({ finalSummary }: Props) {
	const { nodes, edges } = useMemo(
		() => buildDiagram(finalSummary),
		[finalSummary],
	);

	return (
		<div className="mt-4 h-[260px] overflow-hidden rounded-lg border border-border bg-muted/20">
			<ReactFlowProvider>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					nodesDraggable={false}
					nodesConnectable={false}
					elementsSelectable={false}
					panOnDrag={false}
					zoomOnScroll={false}
					zoomOnPinch={false}
					zoomOnDoubleClick={false}
					preventScrolling={false}
					fitView
					fitViewOptions={{ padding: 0.2 }}
					proOptions={{ hideAttribution: true }}
				>
					<Background color="var(--color-border)" gap={16} />
				</ReactFlow>
			</ReactFlowProvider>
		</div>
	);
}

function buildDiagram(finalSummary: FinalSummaryContent) {
	const rawNodes: Node[] = [
		{
			id: "agent",
			data: { label: `🎭 ${finalSummary.agentName}` },
			position: { x: 0, y: 0 },
			style: {
				width: NODE_WIDTH,
				background: "hsl(var(--primary) / 0.1)",
				borderColor: "hsl(var(--primary))",
				borderWidth: 2,
				borderRadius: 12,
				fontWeight: 600,
			},
			sourcePosition: Position.Bottom,
		},
	];

	const rawEdges: Edge[] = [];

	for (const capId of finalSummary.capabilitiesSummary) {
		const label = CAPABILITY_LABELS[capId] ?? capId;
		rawNodes.push({
			id: `cap-${capId}`,
			data: { label },
			position: { x: 0, y: 0 },
			style: {
				width: NODE_WIDTH,
				background: "hsl(var(--card))",
				borderColor: "hsl(var(--border))",
				borderWidth: 1,
				borderRadius: 8,
				fontSize: 13,
			},
			targetPosition: Position.Top,
		});
		rawEdges.push({
			id: `e-agent-${capId}`,
			source: "agent",
			target: `cap-${capId}`,
			type: "smoothstep",
			animated: true,
			style: { stroke: "hsl(var(--muted-foreground) / 0.4)" },
		});
	}

	return applyDagreLayout(rawNodes, rawEdges);
}

function applyDagreLayout(nodes: Node[], edges: Edge[]) {
	const graph = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
	graph.setGraph({ rankdir: "TB", ranksep: 60, nodesep: 40 });

	for (const node of nodes) {
		graph.setNode(node.id, {
			width: NODE_WIDTH,
			height: NODE_HEIGHT,
		});
	}
	for (const edge of edges) {
		graph.setEdge(edge.source, edge.target);
	}

	Dagre.layout(graph);

	const laidOut = nodes.map((node) => {
		const pos = graph.node(node.id);
		return {
			...node,
			position: {
				x: pos.x - NODE_WIDTH / 2,
				y: pos.y - NODE_HEIGHT / 2,
			},
		};
	});

	return { nodes: laidOut, edges };
}
