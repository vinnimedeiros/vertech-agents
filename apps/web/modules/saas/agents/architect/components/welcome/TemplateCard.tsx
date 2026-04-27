import { cn } from "@ui/lib";
import Link from "next/link";
import type { ArchitectTemplate } from "../../lib/templates";

type Props = {
	template: ArchitectTemplate;
	organizationSlug: string;
};

/**
 * Card de template na tela de boas-vindas do Arquiteto (story 09.1).
 *
 * Link cobre toda a area. Hover sobe o card suavemente (scale 1.02) e muda
 * a borda pra primary/50. Template "custom" tem border-dashed pra se destacar
 * visualmente como opt-out dos presets.
 */
export function TemplateCard({ template, organizationSlug }: Props) {
	const href = `/app/${organizationSlug}/agents/new?template=${template.id}`;

	return (
		<Link
			href={href}
			className={cn(
				"group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-5 text-center transition-all duration-150",
				"hover:border-primary/50 hover:scale-[1.02] hover:shadow-md",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
				template.dashed
					? "border-dashed border-border"
					: "border-border",
			)}
			aria-label={`Criar agente com template ${template.label}`}
		>
			<span
				aria-hidden="true"
				className="flex size-12 items-center justify-center text-4xl leading-none"
			>
				{template.emoji}
			</span>
			<span className="font-medium text-base text-foreground">
				{template.label}
			</span>
			<span className="line-clamp-2 text-foreground/60 text-xs">
				{template.description}
			</span>
		</Link>
	);
}
