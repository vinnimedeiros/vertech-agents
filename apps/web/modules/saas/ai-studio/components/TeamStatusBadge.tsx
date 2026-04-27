import { cn } from "@ui/lib";

type TeamStatus = "DRAFT" | "ACTIVE" | "SANDBOX" | "PAUSED" | "ARCHIVED";

const labels: Record<TeamStatus, string> = {
	DRAFT: "Rascunho",
	ACTIVE: "Ativo",
	SANDBOX: "Em testes",
	PAUSED: "Pausado",
	ARCHIVED: "Arquivado",
};

const styles: Record<TeamStatus, string> = {
	DRAFT: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
	ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
	SANDBOX: "border-amber-500/30 bg-amber-500/10 text-amber-400",
	PAUSED: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
	ARCHIVED: "border-zinc-700/30 bg-zinc-700/10 text-zinc-500",
};

const dots: Record<TeamStatus, string> = {
	DRAFT: "bg-indigo-400",
	ACTIVE: "bg-emerald-400",
	SANDBOX: "bg-amber-400",
	PAUSED: "bg-zinc-400",
	ARCHIVED: "bg-zinc-500",
};

export function TeamStatusBadge({ status }: { status: TeamStatus }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium text-[11px]",
				styles[status],
			)}
		>
			<span
				className={cn(
					"size-1.5 rounded-full",
					dots[status],
					status === "ACTIVE" && "animate-pulse",
				)}
			/>
			{labels[status]}
		</span>
	);
}
