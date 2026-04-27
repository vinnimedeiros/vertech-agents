"use client";

import { cn } from "@ui/lib";
import { WifiOffIcon } from "lucide-react";

/**
 * Badge visível no header quando user está offline (story 09.10).
 *
 * Dot vermelho pulsante + ícone + label. Composer disabled em paralelo
 * (estado gerenciado pelo ChatShell/Composer via useOnlineStatus).
 */
export function OfflineBadge({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive text-xs",
				className,
			)}
			aria-live="polite"
		>
			<span className="relative flex size-1.5">
				<span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-70" />
				<span className="relative inline-flex size-1.5 rounded-full bg-destructive" />
			</span>
			<WifiOffIcon className="size-3" />
			Offline
		</span>
	);
}
