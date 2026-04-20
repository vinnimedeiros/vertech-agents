import { Button } from "@ui/components/button";
import { PlusIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";

type Props = {
	organizationSlug: string;
	variant: "empty" | "compressed";
};

/**
 * Hero da tela de boas-vindas do Arquiteto (story 09.1 AC4-5).
 *
 * Dois estados:
 * - `empty`: usuario sem agentes ainda. Hero dominante max-w 640px centralizado
 *   com titulo grande, subtitulo muted e CTA lg "Criar com o Arquiteto".
 * - `compressed`: usuario ja tem agentes/rascunhos. PageHeader padrao com
 *   titulo "Agentes", subtitulo e CTA "+ Criar novo agente" a direita.
 */
export function Hero({ organizationSlug, variant }: Props) {
	const ctaHref = `/app/${organizationSlug}/agents/new`;

	if (variant === "empty") {
		return (
			<div className="flex flex-col items-center gap-6 py-8 text-center md:py-16">
				<div className="max-w-[640px] space-y-3">
					<h1 className="font-semibold text-3xl text-foreground md:text-4xl">
						Crie seu primeiro agente comercial em 15 minutos
					</h1>
					<p className="mx-auto max-w-[480px] text-foreground/60 text-base">
						O Arquiteto conduz a conversa em 4 etapas e entrega um
						agente pronto pra atender seus leads no WhatsApp.
					</p>
				</div>
				<Button asChild size="lg">
					<Link href={ctaHref}>
						<SparklesIcon className="mr-2 size-5" />
						Criar com o Arquiteto
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 border-border border-b pb-6 md:flex-row md:items-end md:justify-between">
			<div>
				<h1 className="font-semibold text-2xl text-foreground">
					Agentes
				</h1>
				<p className="mt-1 text-foreground/60 text-sm">
					Agentes de IA que atendem seus leads no WhatsApp.
				</p>
			</div>
			<Button asChild>
				<Link href={ctaHref}>
					<PlusIcon className="mr-2 size-4" />
					Criar novo agente
				</Link>
			</Button>
		</div>
	);
}
