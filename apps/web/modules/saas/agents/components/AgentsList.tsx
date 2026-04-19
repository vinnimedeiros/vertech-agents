import type { AgentListRow } from "../lib/server";
import { AgentCard } from "./AgentCard";

type Props = {
	agents: AgentListRow[];
	organizationSlug: string;
	whatsappInstancesById: Record<string, string>;
};

export function AgentsList({
	agents,
	organizationSlug,
	whatsappInstancesById,
}: Props) {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{agents.map((agent) => (
				<AgentCard
					key={agent.id}
					agent={agent}
					organizationSlug={organizationSlug}
					whatsappInstanceName={
						agent.whatsappInstanceId
							? whatsappInstancesById[agent.whatsappInstanceId]
							: null
					}
				/>
			))}
		</div>
	);
}
