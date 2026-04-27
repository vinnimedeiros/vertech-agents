import { CommercialTabs } from "@saas/shared/components/CommercialTabs";
import { FloatingCanvas } from "@saas/shared/floating";
import type { PropsWithChildren } from "react";

export default async function CrmLayout({
	children,
	params,
}: PropsWithChildren<{ params: Promise<{ organizationSlug: string }> }>) {
	const { organizationSlug } = await params;

	return (
		<FloatingCanvas className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden">
			<div className="flex min-h-0 w-full flex-1 flex-col gap-3 p-3">
				<CommercialTabs organizationSlug={organizationSlug} />

				<div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
			</div>
		</FloatingCanvas>
	);
}
