"use client";

import { CAPABILITY_LABELS, type FinalSummaryContent } from "../../../lib/artifact-types";

type Props = { content: FinalSummaryContent };

export function FinalSummaryRenderer({ content }: Props) {
	return (
		<div className="space-y-3 text-sm">
			<header>
				<h4 className="font-semibold text-base text-foreground">
					{content.agentName}
				</h4>
				<p className="text-foreground/60 text-xs">{content.role}</p>
			</header>

			<dl className="grid gap-2.5">
				<Row label="Negócio" value={content.businessSummary} />
				<Row label="Persona" value={content.personaSummary} />
				<Row label="Técnicas" value={content.techniquesSummary} />
				<Row
					label="Capabilities"
					value={
						content.capabilitiesSummary.length > 0 ? (
							<ul className="flex flex-wrap gap-1">
								{content.capabilitiesSummary.map((c) => (
									<li
										key={c}
										className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs"
									>
										{CAPABILITY_LABELS[c] ?? c}
									</li>
								))}
							</ul>
						) : (
							"—"
						)
					}
				/>
				<Row
					label="Documentos indexados"
					value={`${content.knowledgeDocCount} arquivo${content.knowledgeDocCount === 1 ? "" : "s"}`}
				/>
			</dl>
		</div>
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
			<dd className="text-foreground/90 text-xs">{value || "—"}</dd>
		</div>
	);
}
