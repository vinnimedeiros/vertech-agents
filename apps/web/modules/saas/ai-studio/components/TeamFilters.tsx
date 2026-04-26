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
		<nav className="flex flex-wrap items-center gap-2 border-border/50 border-b pb-4">
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
				"flex items-center gap-2 rounded-md border px-3 py-1.5 font-medium text-xs transition-colors",
				active
					? "border-primary/50 bg-primary/10 text-foreground"
					: "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/50 hover:text-foreground",
			)}
		>
			{label}
			<span
				className={cn(
					"rounded-full bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]",
					active && "bg-primary/20 text-primary",
				)}
			>
				{count}
			</span>
		</Link>
	);
}
