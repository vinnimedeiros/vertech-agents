import { ensureDefaultCalendar } from "@repo/auth";
import { AgendaShell } from "@saas/agenda/components/AgendaShell";
import {
	listCalendarsForOrg,
	listEventsInRange,
} from "@saas/agenda/lib/server";
import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
	params: Promise<{ organizationSlug: string }>;
};

export default async function CrmAgendaPage({ params }: Props) {
	const { organizationSlug } = await params;

	const session = await getSession();
	if (!session?.user) redirect("/auth/login");

	const org = await getActiveOrganization(organizationSlug);
	if (!org) return notFound();

	// Garante calendar default. Idempotente, safe pra orgs antigas.
	await ensureDefaultCalendar(org.id);

	const [calendars, events] = await Promise.all([
		listCalendarsForOrg(org.id),
		// Busca eventos do mês anterior + atual + dois próximos pra ter pontos no picker
		listEventsInRange(
			org.id,
			startOfMonth(subMonths(new Date(), 1)),
			endOfMonth(
				new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0),
			),
		),
	]);

	return (
		<>
			<PageHeader
				title="Agenda"
				subtitle="Eventos, reuniões e compromissos do seu workspace"
			/>
			<AgendaShell
				organizationId={org.id}
				organizationSlug={organizationSlug}
				calendars={calendars}
				events={events}
			/>
		</>
	);
}
