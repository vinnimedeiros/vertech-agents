import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { getGoogleConnectionStatus } from "@saas/integrations/google/lib/server";
import { CommercialPageTitle } from "@saas/shared/components/CommercialPageTitle";
import { GoogleCalendarIntegrationCard } from "@saas/whatsapp/components/GoogleCalendarIntegrationCard";
import { WhatsAppIntegrationCard } from "@saas/whatsapp/components/WhatsAppIntegrationCard";
import { listInstancesForOrg } from "@saas/whatsapp/lib/server";
import { LinkIcon } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CrmIntegracoesPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const [org, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);
	if (!org) return notFound();
	if (!session?.user) return notFound();

	const [instances, googleStatus] = await Promise.all([
		listInstancesForOrg(org.id),
		getGoogleConnectionStatus(org.id, session.user.id),
	]);

	const hasGoogleCredentials = Boolean(
		process.env.GOOGLE_OAUTH_CLIENT_ID &&
			process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
			process.env.GOOGLE_OAUTH_REDIRECT_URI,
	);

	return (
		<div className="flex flex-1 flex-col gap-4 overflow-y-auto">
			<CommercialPageTitle
				primary="Integrações"
				accent="comerciais"
				icon={LinkIcon}
				subtitle="Conecte WhatsApp, Google Calendar e outras ferramentas."
			/>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<WhatsAppIntegrationCard
					organizationId={org.id}
					organizationSlug={organizationSlug}
					instances={instances}
				/>
				<GoogleCalendarIntegrationCard
					hasCredentials={hasGoogleCredentials}
					organizationId={org.id}
					organizationSlug={organizationSlug}
					status={googleStatus}
				/>
			</div>
		</div>
	);
}
