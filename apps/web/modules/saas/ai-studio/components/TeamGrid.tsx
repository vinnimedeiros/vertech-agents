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
			<div className="flex items-center justify-center rounded-xl bg-muted/30 dark:bg-zinc-950/50 py-12 text-center">
				<p className="text-[13px] text-zinc-500">
					Nenhum TIME corresponde ao filtro.
				</p>
			</div>
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

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-muted/30 dark:bg-zinc-950/50 px-6 py-16 text-center">
			<div className="flex size-12 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-foreground/10">
				<SparklesIcon className="size-5 text-muted-foreground" />
			</div>
			<div className="flex flex-col gap-1">
				<h2
					className="font-medium text-[15px] text-foreground"
					style={{ fontFamily: "var(--font-satoshi)" }}
				>
					Nenhum TIME configurado
				</h2>
				<p className="max-w-sm text-[12.5px] text-muted-foreground leading-relaxed">
					A Master Agency Vertech configurará o primeiro TIME para esta
					organização.
				</p>
			</div>
		</div>
	);
}
