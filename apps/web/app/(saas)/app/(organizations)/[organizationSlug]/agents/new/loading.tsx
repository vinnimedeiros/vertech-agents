import { Loader2Icon } from "lucide-react";

/**
 * Loading state do wizard. Pareado com error.tsx irmão.
 */
export default function NewAgentLoading() {
	return (
		<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
			<div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
				<Loader2Icon className="size-8 animate-spin text-primary" />
				<p className="text-foreground/60 text-sm">
					Preparando o Arquiteto...
				</p>
			</div>
		</div>
	);
}
