import { ensureDefaultCalendar } from "@repo/auth";
import { AgendaShell } from "@saas/agenda/components/AgendaShell";
import {
	listCalendarsForOrg,
	listEventsInRange,
} from "@saas/agenda/lib/server";
import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
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

	await ensureDefaultCalendar(org.id);

	const [calendars, events] = await Promise.all([
		listCalendarsForOrg(org.id),
		listEventsInRange(
			org.id,
			startOfMonth(subMonths(new Date(), 1)),
			endOfMonth(
				new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0),
			),
		),
	]);

	return (
		<AgendaShell
			organizationId={org.id}
			organizationSlug={organizationSlug}
			calendars={calendars}
			events={events}
		/>
	);
}
