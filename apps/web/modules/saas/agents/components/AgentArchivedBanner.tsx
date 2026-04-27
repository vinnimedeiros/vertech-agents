"use client";

import { Button } from "@ui/components/button";
import { ArchiveIcon, Loader2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { unarchiveAgentAction } from "../lib/actions";

type Props = {
	agentId: string;
	organizationSlug: string;
};

export function AgentArchivedBanner({ agentId, organizationSlug }: Props) {
	const [pending, startTransition] = useTransition();

	const handleUnarchive = () => {
		startTransition(async () => {
			try {
				await unarchiveAgentAction({ agentId }, organizationSlug);
				toast.success("Agente desarquivado.");
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível desarquivar.");
			}
		});
	};

	return (
		<div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm">
			<div className="flex items-center gap-3">
				<ArchiveIcon className="size-4 text-red-600 dark:text-red-400" />
				<span className="text-foreground/80">
					Este agente está arquivado. Desarquive pra editar.
				</span>
			</div>
			<Button
				variant="outline"
				size="sm"
				onClick={handleUnarchive}
				disabled={pending}
			>
				{pending ? (
					<Loader2Icon className="mr-2 size-4 animate-spin" />
				) : null}
				Desarquivar
			</Button>
		</div>
	);
}
