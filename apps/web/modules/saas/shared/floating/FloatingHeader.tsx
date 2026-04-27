import { cn } from "@ui/lib";
import type { ReactNode } from "react";
import { FloatingPanel } from "./FloatingPanel";

type FloatingHeaderProps = {
	title?: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	children?: ReactNode;
	className?: string;
};

/**
 * Header floating fino pra rotas do comercial. 2 modos:
 *
 *   1. Modo title/actions — passa `title`, opcionalmente `description`
 *      (separada por divider vertical) e `actions` (botões à direita).
 *
 *   2. Modo container — passa apenas `children` (ex: FloatingTabs)
 *      pra renderizar conteúdo livre dentro do header.
 *
 * Sempre wrappa com FloatingPanel pra herdar bg/blur/shadow padrão.
 */
export function FloatingHeader({
	title,
	description,
	actions,
	children,
	className,
}: FloatingHeaderProps) {
	if (children) {
		return (
			<FloatingPanel as="header" className={cn("px-2 py-1.5", className)}>
				{children}
			</FloatingPanel>
		);
	}

	return (
		<FloatingPanel
			as="header"
			variant="tight"
			className={cn("px-4 py-2", className)}
		>
			<div className="flex items-center justify-between gap-4">
				<div className="flex min-w-0 items-center gap-3">
					{title}
					{description ? (
						<>
							<span className="hidden h-4 w-px bg-border sm:block" />
							<p className="hidden text-[13px] text-muted-foreground sm:block">
								{description}
							</p>
						</>
					) : null}
				</div>
				{actions ? (
					<div className="flex items-center gap-2">{actions}</div>
				) : null}
			</div>
		</FloatingPanel>
	);
}
