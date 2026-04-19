import { Badge } from "@ui/components/badge";
import { cn } from "@ui/lib";
import type { AgentStatus } from "../lib/schemas";

const STATUS_LABEL: Record<AgentStatus, string> = {
	DRAFT: "Rascunho",
	ACTIVE: "Ativo",
	PAUSED: "Pausado",
	ARCHIVED: "Arquivado",
};

const STATUS_CONFIG: Record<
	AgentStatus,
	{
		status: "success" | "info" | "warning" | "error";
		extraClasses?: string;
	}
> = {
	// DRAFT usa "info" (primary) como base e sobrescreve pra tom neutro
	DRAFT: {
		status: "info",
		extraClasses: "bg-muted/60 text-foreground/70",
	},
	ACTIVE: { status: "success" },
	PAUSED: { status: "warning" },
	ARCHIVED: { status: "error" },
};

type Props = {
	status: AgentStatus;
	className?: string;
};

export function AgentStatusBadge({ status, className }: Props) {
	const cfg = STATUS_CONFIG[status];
	return (
		<Badge status={cfg.status} className={cn(cfg.extraClasses, className)}>
			{STATUS_LABEL[status]}
		</Badge>
	);
}
