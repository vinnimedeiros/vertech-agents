"use client";

import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { AgentEditorNav, type Section } from "./AgentEditorNav";

type Agent = {
	id: string;
	name: string;
	role: string | null;
	description: string | null;
	model: string;
	temperature: number;
	maxSteps: number;
	enabledTools: string[] | null;
	knowledgeDocIds: string[] | null;
	gender: string | null;
};

type Props = {
	agent: Agent;
	teamName: string;
	organizationSlug: string;
	teamId: string;
};

export function AgentEditorShell({ agent, teamName, organizationSlug, teamId }: Props) {
	const [section, setSection] = useState<Section>("persona");
	const [chatOpen, setChatOpen] = useState(true);
	const [logsOpen, setLogsOpen] = useState(true);

	return (
		<div className="flex flex-1 flex-col">
			{/* Top bar */}
			<header className="flex items-center justify-between gap-4 border-border border-b bg-card/30 px-6 py-3">
				<div className="flex items-center gap-3">
					<a
						href={`/app/${organizationSlug}/ai-studio/teams/${teamId}`}
						className="text-muted-foreground text-xs hover:text-foreground"
					>
						AI Studio
					</a>
					<span className="text-muted-foreground/50 text-xs">›</span>
					<a
						href={`/app/${organizationSlug}/ai-studio/teams/${teamId}`}
						className="text-muted-foreground text-xs hover:text-foreground"
					>
						{teamName}
					</a>
					<span className="text-muted-foreground/50 text-xs">›</span>
					<span className="font-medium text-foreground text-sm">{agent.name}</span>
				</div>
				<Button size="sm" disabled>
					Salvar
				</Button>
			</header>

			{/* 3-column layout */}
			<div className="flex flex-1 overflow-hidden">
				<AgentEditorNav current={section} onChange={setSection} />

				{/* Center canvas */}
				<main className="flex flex-1 flex-col overflow-y-auto">
					<div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
						<PersonaCard agent={agent} />
						<SectionContent section={section} agent={agent} />
					</div>

					{/* Bottom split — Chat collab + Logs */}
					<div className="grid grid-cols-1 gap-px border-border border-t bg-border lg:grid-cols-2">
						<CollapsiblePanel
							title="Chat colaborador"
							open={chatOpen}
							onToggle={() => setChatOpen(!chatOpen)}
						>
							<p className="text-muted-foreground text-xs italic">
								Phase 11.3.2 — chat conversando com o Arquiteto pra editar
								este agente. Aguardando wire.
							</p>
						</CollapsiblePanel>
						<CollapsiblePanel
							title="Logs ao vivo (sandbox)"
							open={logsOpen}
							onToggle={() => setLogsOpen(!logsOpen)}
						>
							<p className="text-muted-foreground text-xs italic">
								Phase 11.3.3 — execução em tempo real (tool calls, scores,
								tokens). Aguardando wire.
							</p>
						</CollapsiblePanel>
					</div>
				</main>

				{/* Right properties panel */}
				<aside className="flex w-[360px] flex-col gap-3 overflow-y-auto border-border border-l bg-card/30 p-4">
					<PropertiesAccordion title="Modelo" defaultOpen>
						<div className="flex flex-col gap-2 text-sm">
							<KV label="Model" value={agent.model} />
							<KV label="Temperatura" value={agent.temperature.toFixed(2)} />
							<KV label="Max steps" value={String(agent.maxSteps)} />
						</div>
					</PropertiesAccordion>
					<PropertiesAccordion title="Memória">
						<div className="flex flex-col gap-2 text-xs text-muted-foreground">
							<p>Working memory: schema Lead Profile (8 campos).</p>
							<p>Recall semântico: top 5, scope resource.</p>
							<p>Observational: gemini-2.5-flash, 30k tokens.</p>
						</div>
					</PropertiesAccordion>
					<PropertiesAccordion title="Modos">
						<div className="flex flex-col gap-1.5 text-xs">
							<ModeRow label="SDR (atual)" active />
							<ModeRow label="Closer" />
							<ModeRow label="Pós-venda" />
						</div>
					</PropertiesAccordion>
					<PropertiesAccordion title="Ferramentas">
						<div className="flex flex-col gap-1 text-xs">
							{(agent.enabledTools ?? []).slice(0, 6).map((t) => (
								<span key={t} className="rounded bg-muted/30 px-2 py-1 font-mono">
									{t}
								</span>
							))}
							{(agent.enabledTools?.length ?? 0) > 6 ? (
								<span className="text-muted-foreground">
									+{(agent.enabledTools?.length ?? 0) - 6} mais...
								</span>
							) : null}
						</div>
					</PropertiesAccordion>
					<PropertiesAccordion title="Voz / TTS">
						<p className="text-muted-foreground text-xs italic">
							Não habilitada
						</p>
					</PropertiesAccordion>
				</aside>
			</div>
		</div>
	);
}

function PersonaCard({ agent }: { agent: Agent }) {
	const initials = agent.name
		.split(/\s+/)
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-lg">
			<Avatar className="size-20 rounded-2xl">
				<AvatarFallback className="rounded-2xl bg-primary/10 font-semibold text-2xl text-primary">
					{initials}
				</AvatarFallback>
			</Avatar>
			<div className="flex flex-col items-center gap-0.5 text-center">
				<h2 className="font-semibold text-foreground text-xl">{agent.name}</h2>
				<p className="text-muted-foreground text-sm">{agent.role ?? "Agente"}</p>
			</div>
			{agent.description ? (
				<p className="line-clamp-3 text-center text-muted-foreground text-xs">
					{agent.description}
				</p>
			) : null}
		</div>
	);
}

function SectionContent({ section, agent }: { section: Section; agent: Agent }) {
	const labels: Record<Section, string> = {
		persona: "Persona",
		model: "Modelo de IA",
		memory: "Memória",
		modes: "Modos contextuais",
		tools: "Ferramentas",
		deploy: "Publicar",
	};

	return (
		<div className="flex w-full max-w-2xl flex-col gap-3 rounded-xl border border-border border-dashed bg-muted/10 p-6 text-center">
			<p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
				Seção: {labels[section]}
			</p>
			<p className="text-muted-foreground text-sm">
				Editor de {labels[section]} chega na próxima iteração da Phase 11.3.
				Por enquanto, propriedades mostradas no painel direito.
			</p>
		</div>
	);
}

function CollapsiblePanel({
	title,
	open,
	onToggle,
	children,
}: {
	title: string;
	open: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col bg-card/30">
			<button
				type="button"
				onClick={onToggle}
				className="flex items-center justify-between gap-2 px-4 py-2 text-left font-medium text-xs hover:bg-muted/30"
			>
				<span>{title}</span>
				{open ? (
					<ChevronDownIcon className="size-3.5 text-muted-foreground" />
				) : (
					<ChevronUpIcon className="size-3.5 text-muted-foreground" />
				)}
			</button>
			{open ? <div className="px-4 pb-4">{children}</div> : null}
		</section>
	);
}

function PropertiesAccordion({
	title,
	children,
	defaultOpen,
}: {
	title: string;
	children: React.ReactNode;
	defaultOpen?: boolean;
}) {
	const [open, setOpen] = useState(defaultOpen ?? false);
	return (
		<div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-3">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center justify-between gap-2 text-left font-medium text-foreground text-xs"
			>
				<span>{title}</span>
				{open ? (
					<ChevronDownIcon className="size-3 text-muted-foreground" />
				) : (
					<ChevronUpIcon className="size-3 text-muted-foreground" />
				)}
			</button>
			{open ? children : null}
		</div>
	);
}

function KV({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-2 text-xs">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-mono text-foreground">{value}</span>
		</div>
	);
}

function ModeRow({ label, active }: { label: string; active?: boolean }) {
	return (
		<div className={cn("flex items-center gap-2", !active && "text-muted-foreground")}>
			<span className={cn("size-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/30")} />
			{label}
		</div>
	);
}
