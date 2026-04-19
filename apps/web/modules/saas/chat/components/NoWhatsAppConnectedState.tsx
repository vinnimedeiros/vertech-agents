import { Button } from "@ui/components/button";
import { MessageCircleIcon, PlugIcon } from "lucide-react";
import Link from "next/link";

type Props = {
	organizationSlug: string;
};

/**
 * Empty state do chat quando a org não tem nenhum número de WhatsApp
 * conectado ativo. Call-to-action centralizado que leva pra tela de
 * integrações — onde o usuário pode criar a instância e escanear o QR.
 */
export function NoWhatsAppConnectedState({ organizationSlug }: Props) {
	return (
		<div className="flex min-h-0 w-full flex-1 items-center justify-center rounded-lg border border-border/60 bg-background">
			<div className="flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center">
				<div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
					<MessageCircleIcon className="size-7" />
				</div>
				<div className="space-y-1.5">
					<h3 className="text-lg font-semibold text-foreground">
						Nenhum número conectado
					</h3>
					<p className="text-sm text-foreground/60">
						Pra receber e responder mensagens pelo chat, conecte primeiro
						um número de WhatsApp nas integrações.
					</p>
				</div>
				<Button asChild className="gap-1.5">
					<Link href={`/app/${organizationSlug}/crm/integracoes`}>
						<PlugIcon className="size-3.5" />
						Ir para integrações
					</Link>
				</Button>
			</div>
		</div>
	);
}
