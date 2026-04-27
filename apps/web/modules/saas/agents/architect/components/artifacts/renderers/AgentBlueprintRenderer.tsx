"use client";

import { cn } from "@ui/lib";
import {
	type AgentBlueprintContent,
	CAPABILITY_LABELS,
	SALES_TECHNIQUE_LABELS,
} from "../../../lib/artifact-types";

type Props = { content: AgentBlueprintContent };

export function AgentBlueprintRenderer({ content }: Props) {
	const p = content.persona;

	return (
		<div className="space-y-4 text-sm">
			<section>
				<Heading>Persona</Heading>
				<p className="mb-2 text-foreground">
					<span className="font-medium">{p.name}</span>{" "}
					<span className="text-foreground/60">
						({p.gender === "FEMININE" ? "feminino" : "masculino"})
					</span>
				</p>
				<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
					<Slider label="Tom" value={p.tone} />
					<Slider label="Formalidade" value={p.formality} />
					<Slider label="Humor" value={p.humor} />
					<Slider label="Empatia" value={p.empathy} />
				</div>
				{p.antiPatterns.length > 0 ? (
					<div className="mt-3">
						<p className="mb-1 text-foreground/60 text-xs">
							Anti-patterns
						</p>
						<ul className="ml-4 list-disc space-y-0.5 text-foreground/80">
							{p.antiPatterns.map((ap) => (
								<li key={ap}>{ap}</li>
							))}
						</ul>
					</div>
				) : null}
			</section>

			{content.salesTechniques.length > 0 ? (
				<section>
					<Heading>Técnicas comerciais</Heading>
					<ul className="flex flex-wrap gap-1.5">
						{content.salesTechniques.map((t) => (
							<li
								key={`${t.presetId}-${t.intensity}`}
								className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs"
							>
								{SALES_TECHNIQUE_LABELS[t.presetId] ??
									t.presetId}
								<span className="ml-1 text-foreground/50">
									· {t.intensity}
								</span>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<section>
				<Heading>Emojis</Heading>
				<p className="text-foreground/80 text-xs">
					Modo: <span className="font-medium">{content.emojiConfig.mode}</span>
					{content.emojiConfig.curatedList?.length
						? `  ·  ${content.emojiConfig.curatedList.join(" ")}`
						: ""}
				</p>
			</section>

			{content.voiceConfig.enabled ? (
				<section>
					<Heading>Voz TTS</Heading>
					<p className="text-foreground/80 text-xs">
						{content.voiceConfig.provider ?? "sem provedor"} ·{" "}
						{content.voiceConfig.mode}
					</p>
				</section>
			) : null}

			{content.capabilities.length > 0 ? (
				<section>
					<Heading>Capabilities</Heading>
					<ul className="flex flex-wrap gap-1.5">
						{content.capabilities.map((c) => (
							<li
								key={c}
								className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary text-xs"
							>
								{CAPABILITY_LABELS[c] ?? c}
							</li>
						))}
					</ul>
				</section>
			) : null}
		</div>
	);
}

function Heading({ children }: { children: React.ReactNode }) {
	return (
		<h4 className="mb-1.5 font-medium text-foreground/60 text-xs uppercase tracking-wide">
			{children}
		</h4>
	);
}

function Slider({ label, value }: { label: string; value: number }) {
	const pct = Math.max(0, Math.min(100, value));
	return (
		<div>
			<div className="mb-1 flex items-center justify-between">
				<span className="text-foreground/60 text-xs">{label}</span>
				<span className="font-medium text-foreground text-xs">
					{pct}
				</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-muted">
				<div
					className={cn("h-full rounded-full bg-primary")}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}
