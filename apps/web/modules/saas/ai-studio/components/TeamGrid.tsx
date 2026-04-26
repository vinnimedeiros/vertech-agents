import { SparklesIcon } from "lucide-react";
import type { TeamWithMembers } from "../lib/types";
import { TeamCard } from "./TeamCard";

type Props = {
	teams: TeamWithMembers[];
	organizationSlug: string;
	isEmpty: boolean;
};

export function TeamGrid({ teams, organizationSlug, isEmpty }: Props) {
	if (isEmpty) {
		return <EmptyState />;
	}

	if (teams.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border border-dashed bg-muted/10 py-16 text-center">
				<p className="text-muted-foreground text-sm">
					Nenhum TIME corresponde ao filtro.
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border border-dashed bg-muted/10 py-20 text-center">
			<div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
				<SparklesIcon className="size-8" />
			</div>
			<div className="flex flex-col gap-1">
				<h2 className="font-semibold text-foreground text-lg">
					Nenhum TIME configurado
				</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					A Master Agency Vertech configurará o primeiro TIME para esta
					organização. Aguarde o setup ou entre em contato com a equipe.
				</p>
			</div>
		</div>
	);
}
