"use client";

import { Button } from "@ui/components/button";
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { ExitDialog } from "./ExitDialog";
import { OfflineBadge } from "./OfflineBadge";

type Props = {
	organizationSlug: string;
	templateLabel: string;
	isDirty: boolean;
};

/**
 * Header fino do chat do Arquiteto (story 09.2, zona 1, altura 48px).
 *
 * Esquerda: ArrowLeft + breadcrumb "{templateLabel} ▸ Novo agente"
 * Direita: botao "Salvar e sair"
 *
 * Ambos disparam ExitDialog se `isDirty`. Quando nao-dirty (estado inicial
 * da 09.2 — sem composer real), navega direto pra /agents.
 */
export function ArchitectHeader({
	organizationSlug,
	templateLabel,
	isDirty,
}: Props) {
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = useState(false);
	const isOnline = useOnlineStatus();
	const welcomeHref = `/app/${organizationSlug}/agents`;

	const attemptExit = (e?: React.MouseEvent) => {
		if (isDirty) {
			e?.preventDefault();
			setDialogOpen(true);
		}
	};

	const confirmExit = () => {
		setDialogOpen(false);
		router.push(welcomeHref);
	};

	return (
		<>
			<header className="flex h-12 items-center justify-between border-border border-b bg-background px-4 md:px-6">
				<nav className="flex items-center gap-2 text-sm">
					<Link
						href={welcomeHref}
						onClick={attemptExit}
						aria-label="Voltar para agentes"
						className="flex size-8 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
					>
						<ArrowLeftIcon className="size-4" />
					</Link>
					<Link
						href={welcomeHref}
						onClick={attemptExit}
						className="font-medium text-foreground/70 transition-colors hover:text-foreground"
					>
						{templateLabel}
					</Link>
					<ChevronRightIcon
						aria-hidden="true"
						className="size-4 text-foreground/40"
					/>
					<span className="font-medium text-foreground">
						Novo agente
					</span>
				</nav>

				<div className="flex items-center gap-3">
					{!isOnline ? <OfflineBadge /> : null}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							if (isDirty) {
								setDialogOpen(true);
							} else {
								router.push(welcomeHref);
							}
						}}
					>
						Salvar e sair
					</Button>
				</div>
			</header>

			<ExitDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onConfirmExit={confirmExit}
			/>
		</>
	);
}
