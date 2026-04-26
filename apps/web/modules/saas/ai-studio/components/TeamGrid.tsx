import { FilterXIcon, SparklesIcon } from "lucide-react";
import type { TeamWithMembers } from "../lib/types";
import { StudioEmpty } from "./StudioEmpty";
import { TeamCard } from "./TeamCard";

type Props = {
	teams: TeamWithMembers[];
	organizationSlug: string;
	isEmpty: boolean;
};

export function TeamGrid({ teams, organizationSlug, isEmpty }: Props) {
	if (isEmpty) {
		return (
			<StudioEmpty
				icon={SparklesIcon}
				title="Nenhum TIME configurado"
				description="A Master Agency Vertech configurará o primeiro TIME para esta organização."
			/>
		);
	}

	if (teams.length === 0) {
		return (
			<StudioEmpty
				icon={FilterXIcon}
				title="Nenhum TIME nessa categoria"
				description="Tente outro filtro ou volte para Todos."
			/>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{teams.map((team) => (
				<TeamCard
					key={team.id}
					team={team}
					organizationSlug={organizationSlug}
				/>
			))}
		</div>
	);
}
