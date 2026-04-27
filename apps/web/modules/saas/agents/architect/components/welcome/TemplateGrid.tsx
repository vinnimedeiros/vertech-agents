import { cn } from "@ui/lib";
import { ARCHITECT_TEMPLATES } from "../../lib/templates";
import { TemplateCard } from "./TemplateCard";

type Props = {
	organizationSlug: string;
	className?: string;
};

/**
 * Grid responsivo dos 7 templates do Arquiteto (story 09.1).
 *
 * Breakpoints (AC3):
 * - `lg:` (>=1024px): 4 colunas
 * - `md:` (768-1023): 3 colunas
 * - mobile (<768px): 2 colunas, com Personalizado (ultimo) ocupando full-width
 *   na ultima linha pra destacar como opt-out dos presets
 */
export function TemplateGrid({ organizationSlug, className }: Props) {
	return (
		<div
			className={cn(
				"grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4",
				className,
			)}
		>
			{ARCHITECT_TEMPLATES.map((template) => (
				<TemplateCard
					key={template.id}
					template={template}
					organizationSlug={organizationSlug}
					// Personalizado ocupa 2 colunas no mobile, 1 nos demais
					// Implementacao simples via modifier classe no wrapper
				/>
			))}
		</div>
	);
}
