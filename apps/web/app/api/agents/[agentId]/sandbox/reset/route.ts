import {
	agent as agentTable,
	and,
	calendarEvent,
	db,
	eq,
	lead,
	leadActivity,
} from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * DELETE /api/agents/[agentId]/sandbox/reset — M2-02.
 *
 * Apaga TUDO marcado como isSandbox=true na org do agente:
 * - lead_activity (cascade nada)
 * - calendar_event
 * - lead (cascade vai pra lead_activity em prod, mas aqui delete explicito antes)
 *
 * Não toca em contact (compartilhado entre real e sandbox).
 */
export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ agentId: string }> },
) {
	const session = await getSession();
	if (!session?.user) {
		return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
	}

	const { agentId } = await params;
	const agentRow = await db.query.agent.findFirst({
		where: eq(agentTable.id, agentId),
	});
	if (!agentRow) {
		return NextResponse.json({ error: "AGENT_NOT_FOUND" }, { status: 404 });
	}

	const orgId = agentRow.organizationId;

	// Ordem importa: activities → events → leads
	const actDel = await db
		.delete(leadActivity)
		.where(eq(leadActivity.isSandbox, true))
		.returning({ id: leadActivity.id });

	const evtDel = await db
		.delete(calendarEvent)
		.where(
			and(
				eq(calendarEvent.organizationId, orgId),
				eq(calendarEvent.isSandbox, true),
			),
		)
		.returning({ id: calendarEvent.id });

	const leadDel = await db
		.delete(lead)
		.where(and(eq(lead.organizationId, orgId), eq(lead.isSandbox, true)))
		.returning({ id: lead.id });

	return NextResponse.json({
		ok: true,
		deleted: {
			activities: actDel.length,
			events: evtDel.length,
			leads: leadDel.length,
		},
	});
}
