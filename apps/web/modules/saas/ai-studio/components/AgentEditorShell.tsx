"use client";

import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import Link from "next/link";
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
			{/* Top bar — padrão premium AI Studio */}
			<header className="flex items-center justify-between gap-4 border-zinc-900 border-b bg-zinc-950 px-6 py-3">
				<div className="flex min-w-0 items-center gap-3">
					<Link
						href={`/app/${organizationSlug}/ai-studio/teams/${teamId}`}
						className={cn(
							"flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500",
							"transition-colors hover:bg-zinc-900 hover:text-zinc-200",
						)}
					>
						<ArrowLeftIcon className="size-3.5" />
					</Link>

					<nav className="flex items-baseline gap-1.5 text-[12px] text-zinc-500">
						<Link
							href={`/app/${organizationSlug}/ai-studio`}
							className="transition-colors hover:text-zinc-300"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							AI Studio
						</Link>
						<span className="text-zinc-700">/</span>
						<Link
							href={`/app/${organizationSlug}/ai-studio/teams/${teamId}`}
							className="transition-colors hover:text-zinc-300"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							{teamName}
						</Link>
						<span className="text-zinc-700">/</span>
						<span
							className="font-medium text-[15px] text-zinc-100 leading-none tracking-tight"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							{agent.name}
						</span>
					</nav>
				</div>
				<Button
					size="sm"
					disabled
					className="h-8 bg-zinc-100 text-[12px] text-zinc-900 hover:bg-zinc-200"
				>
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
