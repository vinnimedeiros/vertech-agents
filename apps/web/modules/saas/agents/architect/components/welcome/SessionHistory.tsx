import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@ui/components/accordion";
import type { DraftSessionRow } from "../../lib/server";
import { DraftCard } from "./DraftCard";

type Props = {
	drafts: DraftSessionRow[];
	organizationSlug: string;
	defaultOpen?: boolean;
};

/**
 * Accordion de rascunhos em andamento (story 09.1 AC11-14).
 *
 * Aberto por default quando ha drafts. Empty state inline com mensagem amigavel
 * pra nao deixar o accordion silenciosamente vazio.
 */
export function SessionHistory({
	drafts,
	organizationSlug,
	defaultOpen = true,
}: Props) {
	const count = drafts.length;

	return (
		<Accordion
			type="single"
			collapsible
			defaultValue={defaultOpen ? "drafts" : undefined}
		>
			<AccordionItem value="drafts" className="border-b-0">
				<AccordionTrigger className="font-semibold text-base hover:no-underline">
					<span className="flex items-center gap-2">
						Rascunhos em andamento
						<span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
							{count}
						</span>
					</span>
				</AccordionTrigger>
				<AccordionContent>
					{count === 0 ? (
						<p className="pb-2 text-foreground/60 text-sm">
							Nenhum rascunho em andamento.
						</p>
					) : (
						<div className="flex flex-col gap-3 pb-2">
							{drafts.map((draft) => (
								<DraftCard
									key={draft.id}
									session={draft}
									organizationSlug={organizationSlug}
								/>
							))}
						</div>
					)}
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
