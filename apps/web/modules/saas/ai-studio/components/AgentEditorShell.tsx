"use client";

import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import {
	ArrowLeftIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	SendHorizontalIcon,
} from "lucide-react";
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

const PANEL_CLASSES = cn(
	"overflow-hidden rounded-2xl border border-border/40 bg-card/95 backdrop-blur",
	"shadow-[0_10px_40px_-20px_rgba(0,0,0,0.18),0_4px_12px_-6px_rgba(0,0,0,0.08)]",
	"dark:bg-card/80 dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]",
);

export function AgentEditorShell({
	agent,
	teamName,
	organizationSlug,
	teamId,
}: Props) {
	const [section, setSection] = useState<Section>("persona");
	const [chatOpen, setChatOpen] = useState(true);
	const [logsOpen, setLogsOpen] = useState(true);

	return (
		<div className="flex h-[calc(100vh-var(--shell-header-height))] flex-col gap-3 p-4 lg:gap-4 lg:p-6">
			{/* Top floating bar — header grudado num panel próprio */}
			<header
				className={cn(
					PANEL_CLASSES,
					"flex shrink-0 items-center justify-between gap-4 px-4 py-2.5",
				)}
			>
				<div className="flex min-w-0 items-center gap-3">
					<Link
						href={`/app/${organizationSlug}/ai-studio/teams/${teamId}`}
						className={cn(
							"flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
							"transition-colors hover:bg-muted hover:text-foreground",
						)}
					>
						<ArrowLeftIcon className="size-3.5" />
					</Link>

					<nav className="flex items-baseline gap-1.5 text-[12px] text-muted-foreground">
						<Link
							href={`/app/${organizationSlug}/ai-studio`}
							className="transition-colors hover:text-foreground"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							AI Studio
						</Link>
						<span className="text-muted-foreground/50">/</span>
						<Link
							href={`/app/${organizationSlug}/ai-studio/teams/${teamId}`}
							className="transition-colors hover:text-foreground"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							{teamName}
						</Link>
						<span className="text-muted-foreground/50">/</span>
						<span
							className="font-medium text-[15px] text-foreground leading-none tracking-tight"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							{agent.name}
						</span>
					</nav>
				</div>
				<Button size="sm" disabled className="h-8 text-[12px]">
					Salvar
				</Button>
			</header>

			{/* Main area: 3 colunas floating */}
			<div className="flex min-h-0 flex-1 gap-3 lg:gap-4">
				{/* Left nav */}
				<aside className={cn(PANEL_CLASSES, "w-56 shrink-0 p-2")}>
					<AgentEditorNav current={section} onChange={setSection} />
				</aside>

				{/* Center: persona + section content + bottom split */}
				<div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-4">
					{/* Persona/section panel */}
					<section className={cn(PANEL_CLASSES, "flex-1 overflow-y-auto")}>
						<div className="flex flex-1 flex-col items-center gap-6 p-6 lg:p-8">
							<PersonaCard agent={agent} />
							<SectionContent section={section} />
						</div>
					</section>

					{/* Bottom split: chat collab + logs */}
					<div className="grid h-48 shrink-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
						<section className={cn(PANEL_CLASSES, "flex flex-col")}>
							<button
								type="button"
								onClick={() => setChatOpen(!chatOpen)}
								className="flex shrink-0 items-center justify-between gap-2 border-border/40 border-b px-4 py-2 text-left"
							>
								<span
									className="font-medium text-[12px] text-foreground"
									style={{ fontFamily: "var(--font-satoshi)" }}
								>
									Chat colaborador
								</span>
								{chatOpen ? (
									<ChevronDownIcon className="size-3.5 text-muted-foreground" />
								) : (
									<ChevronUpIcon className="size-3.5 text-muted-foreground" />
								)}
							</button>
							{chatOpen ? (
								<div className="flex flex-1 flex-col">
									<div className="flex-1 overflow-y-auto p-3">
										<p className="text-[11.5px] text-muted-foreground italic">
											Phase 11.3.2 — chat conversando com o Arquiteto pra editar este agente.
										</p>
									</div>
									<div className="flex items-center gap-2 border-border/40 border-t px-3 py-2">
										<input
											type="text"
											placeholder="Editar agente conversando..."
											disabled
											className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/60"
										/>
										<button
											type="button"
											disabled
											className="flex size-7 items-center justify-center rounded-md bg-foreground/5 text-muted-foreground"
										>
											<SendHorizontalIcon className="size-3.5" />
										</button>
									</div>
								</div>
							) : null}
						</section>
						<section className={cn(PANEL_CLASSES, "flex flex-col")}>
							<button
								type="button"
								onClick={() => setLogsOpen(!logsOpen)}
								className="flex shrink-0 items-center justify-between gap-2 border-border/40 border-b px-4 py-2 text-left"
							>
								<span
									className="font-medium text-[12px] text-foreground"
									style={{ fontFamily: "var(--font-satoshi)" }}
								>
									Logs ao vivo (sandbox)
								</span>
								{logsOpen ? (
									<ChevronDownIcon className="size-3.5 text-muted-foreground" />
								) : (
									<ChevronUpIcon className="size-3.5 text-muted-foreground" />
								)}
							</button>
							{logsOpen ? (
								<div className="flex-1 overflow-y-auto p-3 font-mono text-[11px]">
									<p className="text-muted-foreground italic">
										Phase 11.3.3 — execução em tempo real (tool calls, scores, tokens).
									</p>
								</div>
							) : null}
						</section>
					</div>
				</div>

				{/* Right properties panel */}
				<aside
					className={cn(
						PANEL_CLASSES,
						"hidden w-[340px] shrink-0 flex-col gap-2.5 overflow-y-auto p-3 lg:flex",
					)}
				>
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
								<span
									key={t}
									className="rounded bg-muted/50 px-2 py-1 font-mono text-foreground/80"
								>
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
						<p className="text-muted-foreground text-xs italic">Não habilitada</p>
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
		<div className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-primary/20 bg-background/50 p-5 shadow-md backdrop-blur">
			<Avatar className="size-16 rounded-2xl">
				<AvatarFallback className="rounded-2xl bg-primary/10 font-medium text-primary text-xl">
					{initials}
				</AvatarFallback>
			</Avatar>
			<div className="flex flex-col items-center gap-0.5 text-center">
				<h2
					className="font-medium text-[18px] text-foreground"
					style={{ fontFamily: "var(--font-satoshi)" }}
				>
					{agent.name}
				</h2>
				<p className="text-muted-foreground text-[12px]">
					{agent.role ?? "Agente"}
				</p>
			</div>
			{agent.description ? (
				<p className="line-clamp-3 text-center text-muted-foreground text-[12px] leading-relaxed">
					{agent.description}
				</p>
			) : null}
		</div>
	);
}

function SectionContent({ section }: { section: Section }) {
	const labels: Record<Section, string> = {
		persona: "Persona",
		model: "Modelo de IA",
		memory: "Memória",
		modes: "Modos contextuais",
		tools: "Ferramentas",
		deploy: "Publicar",
	};

	return (
		<div className="flex w-full max-w-2xl flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
			<p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
				{labels[section]}
			</p>
			<p className="text-muted-foreground text-[12px]">
				Editor desta seção chega na próxima iteração.
			</p>
		</div>
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
		<div className="flex flex-col gap-2 rounded-lg bg-muted/30 p-2.5">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center justify-between gap-2 text-left font-medium text-[12px] text-foreground"
				style={{ fontFamily: "var(--font-satoshi)" }}
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
		<div className="flex justify-between gap-2 text-[11.5px]">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-mono text-foreground/90">{value}</span>
		</div>
	);
}

function ModeRow({ label, active }: { label: string; active?: boolean }) {
	return (
		<div
			className={cn(
				"flex items-center gap-2 text-[11.5px]",
				!active && "text-muted-foreground",
			)}
		>
			<span
				className={cn(
					"size-1.5 rounded-full",
					active ? "bg-primary" : "bg-muted-foreground/30",
				)}
			/>
			{label}
		</div>
	);
}
