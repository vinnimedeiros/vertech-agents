import { cn } from "@ui/lib";

type AiStudioIconProps = {
	className?: string;
	alt?: string;
};

/**
 * Logo oficial AI Studio (gradient roxo→laranja).
 * Servido como `<img>` apontando pra `public/logos/ai-studio.svg` —
 * cacheado pelo browser, não infla bundle (SVG ~180KB).
 *
 * Substitui ícones Lucide genéricos (Sparkles, Bot) onde a UI representa
 * "Estúdio IA / Arquiteto / Orquestrador / Agente IA". Mantém Lucide em
 * sub-categorias internas (Modelo=Cpu, Modos=Bot, etc) pra não diluir
 * identidade.
 *
 * Tamanho default 20px (size-5). Override via className: `size-4`, `size-8`.
 * Cor é fixa (gradient embutido no SVG) — `text-*` em className é ignorado.
 */
export function AiStudioIcon({ className, alt = "" }: AiStudioIconProps) {
	return (
		<img
			src="/logos/icon-ai-studio.svg"
			alt={alt}
			aria-hidden={alt === "" || undefined}
			draggable={false}
			className={cn("inline-block size-5 shrink-0", className)}
		/>
	);
}
