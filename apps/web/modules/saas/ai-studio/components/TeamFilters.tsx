import { cn } from "@ui/lib";
import Link from "next/link";

type Props = {
	counts: {
		ACTIVE: number;
		SANDBOX: number;
		PAUSED: number;
		DRAFT: number;
	};
	currentStatus: string | undefined;
	basePath: string;
};

const FILTERS: Array<{ key: keyof Props["counts"]; label: string }> = [
	{ key: "ACTIVE", label: "Ativos" },
	{ key: "SANDBOX", label: "Em testes" },
	{ key: "PAUSED", label: "Pausados" },
	{ key: "DRAFT", label: "Rascunhos" },
];

export function TeamFilters({ counts, currentStatus, basePath }: Props) {
	const total = Object.values(counts).reduce((a, b) => a + b, 0);

	return (
		<nav className="flex flex-wrap items-center gap-1.5">
			<FilterPill
				href={basePath}
				label="Todos"
				count={total}
				active={!currentStatus}
			/>
			{FILTERS.map((f) => (
				<FilterPill
					key={f.key}
					href={`${basePath}?status=${f.key.toLowerCase()}`}
					label={f.label}
					count={counts[f.key]}
					active={currentStatus?.toUpperCase() === f.key}
				/>
			))}
		</nav>
	);
}

function FilterPill({
	href,
	label,
	count,
	active,
}: {
	href: string;
	label: string;
	count: number;
	active: boolean;
}) {
	return (
		<Link
			href={href}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] transition-colors",
				active
					? "bg-muted text-foreground"
					: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
			)}
		>
			{label}
			<span
				className={cn(
					"font-mono text-[10px] tabular-nums",
					active ? "text-muted-foreground" : "text-muted-foreground/60",
				)}
			>
				{count}
			</span>
		</Link>
	);
}
