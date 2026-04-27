import {
	agent as agentTable,
	calendarEvent,
	db,
	desc,
	eq,
	lead,
	pipelineStage,
} from "@repo/database";
import { notFound } from "next/navigation";
import { SandboxClient } from "./SandboxClient";

export const dynamic = "force-dynamic";

export default async function SandboxPage({
	params,
}: {
	params: Promise<{ agentId: string; organizationSlug: string }>;
}) {
	const { agentId } = await params;

	const agentRow = await db.query.agent.findFirst({
		where: eq(agentTable.id, agentId),
	});
	if (!agentRow) notFound();

	const orgId = agentRow.organizationId;

	const sandboxLeads = await db.query.lead.findMany({
		where: (l, { and, eq }) => and(eq(l.organizationId, orgId), eq(l.isSandbox, true)),
		with: { contact: true },
		orderBy: desc(lead.createdAt),
		limit: 50,
	});

	const sandboxEvents = await db.query.calendarEvent.findMany({
		where: (e, { and, eq }) => and(eq(e.organizationId, orgId), eq(e.isSandbox, true)),
		orderBy: desc(calendarEvent.startAt),
		limit: 50,
	});

	const stages = await db.query.pipelineStage.findMany({
		where: eq(pipelineStage.pipelineId, sandboxLeads[0]?.pipelineId ?? ""),
	});
	const stageMap = new Map(stages.map((s) => [s.id, s.name]));

	return (
		<SandboxClient
			agentId={agentId}
			agentName={agentRow.name}
			leads={sandboxLeads.map((l) => ({
				id: l.id,
				title: l.title ?? "(sem título)",
				contactName: l.contact?.name ?? "—",
				stageName: stageMap.get(l.stageId) ?? l.stageId,
				temperature: l.temperature,
				createdAt: l.createdAt.toISOString(),
			}))}
			events={sandboxEvents.map((e) => ({
				id: e.id,
				title: e.title,
				startAt: e.startAt.toISOString(),
				duration: e.duration,
			}))}
		/>
	);
}
