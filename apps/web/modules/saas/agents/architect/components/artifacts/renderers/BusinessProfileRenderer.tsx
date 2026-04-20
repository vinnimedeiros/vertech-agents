"use client";

import type { BusinessProfileContent } from "../../../lib/artifact-types";

type Props = { content: BusinessProfileContent };

export function BusinessProfileRenderer({ content }: Props) {
	return (
		<dl className="grid gap-3 text-sm">
			<Row label="Nome do negócio" value={content.businessName} />
			<Row label="Resumo" value={content.summary} />
			<Row
				label="Oferta"
				value={
					content.offering.length > 0 ? (
						<ul className="ml-4 list-disc space-y-0.5 text-foreground/80">
							{content.offering.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					) : (
						"—"
					)
				}
			/>
			<Row label="Público-alvo" value={content.targetAudience} />
			<Row label="Objetivo do agente" value={content.goalForAgent} />
			{content.differentiator ? (
				<Row label="Diferencial" value={content.differentiator} />
			) : null}
		</dl>
	);
}

function Row({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div>
			<dt className="mb-0.5 font-medium text-foreground/60 text-xs uppercase tracking-wide">
				{label}
			</dt>
			<dd className="text-foreground">{value || "—"}</dd>
		</div>
	);
}
