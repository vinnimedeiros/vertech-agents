import { CrmTopbar } from "@saas/crm/components/CrmTopbar";
import type { PropsWithChildren } from "react";

export default function CrmLayout({ children }: PropsWithChildren) {
	return (
		<div className="flex flex-col gap-6">
			<CrmTopbar />
			{children}
		</div>
	);
}
