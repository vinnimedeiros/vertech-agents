"use client";

import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import {
	ArrowLeftIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	MessageSquareIcon,
	SendHorizontalIcon,
	TerminalSquareIcon,
	XIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AgentEditorNav, type Section } from "./AgentEditorNav";
import { AgentWorkflow } from "./AgentWorkflow";

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
	"overflow-hidden rounded-xl border border-border/40 bg-card/95 backdrop-blur",
	"shadow-[0_10px_40px_-20px_rgba(0,0,0,0.18),0_4px_12px_-6px_rgba(0,0,0,0.08)]",
	"dark:bg-card/85 dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]",
);

export function AgentEditorShell({
	agent,
	teamName,
	organizationSlug,
	teamId,
}: Props) {
	const [section, setSection] = useState<Section>("persona");
	const [propertiesOpen, setPropertiesOpen] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);
	const [logsOpen, setLogsOpen] = useState(false);

	const handleSectionChange = (s: Section) => {
		setSection(s);
		setPropertiesOpen(true);
	};

	const handleNodeSelect = (_nodeId: string) => {
		setPropertiesOpen(true);
	};

	return (
		<div className="flex h-full min-h-0 flex-col gap-3 p-3">
			{/* Top header bar */}
			<header
				className={cn(
					PANEL_CLASSES,
					"flex shrink-0 items-center justify-between gap-4 px-4 py-2",
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
							className="font-medium text-[14px] text-foreground leading-none tracking-tight"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							{agent.name}
						</span>
					</nav>
				</div>
				<Button size="sm" disabled className="h-7 text-[12px]">
					Salvar
				</Button>
			</header>

			{/* Main area: 2 colunas. Esquerda nav+chat. Direita workflow+logs */}
			<div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
				{/* Coluna esquerda: nav (em cima) + chat (embaixo) */}
				<div className="flex flex-1 flex-col gap-3">
					<aside className={cn(PANEL_CLASSES, "min-h-0 flex-1 p-2")}>
						<AgentEditorNav current={section} onChange={handleSectionChange} />
					</aside>
					<CollapsiblePanel
						open={chatOpen}
						onToggle={() => setChatOpen(!chatOpen)}
						title="Chat colaborador"
						icon={MessageSquareIcon}
					>
						<div className="flex h-full flex-col">
							<div className="flex-1 overflow-y-auto p-3">
								<p className="text-[11.5px] text-muted-foreground italic">
									Phase 11.3.2 — chat conversando com o Arquiteto pra editar
									este agente.
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
					</CollapsiblePanel>
				</div>

				{/* Coluna direita: workflow+properties (em cima) + logs (embaixo) */}
				<div className="flex min-w-0 flex-1 flex-col gap-3">
					{/* Workflow + properties slide-in (sobreposto) */}
					<div className="relative min-h-0 flex-1 overflow-hidden">
						<AgentWorkflow
							agent={{
								id: agent.id,
								name: agent.name,
								model: agent.model,
								enabledTools: agent.enabledTools,
								knowledgeDocIds: agent.knowledgeDocIds,
							}}
							onNodeSelect={handleNodeSelect}
						/>

						{/* Persona badge floating top-left */}
						<div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg border border-border/40 bg-background/85 px-2.5 py-1.5 backdrop-blur">
							<Avatar className="size-6 rounded-md">
								<AvatarFallback className="rounded-md bg-primary/10 text-[10px] text-primary">
									{agent.name
										.split(/\s+/)
										.map((w) => w[0])
										.slice(0, 2)
										.join("")
										.toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col leading-none">
								<span
									className="font-medium text-[12px] text-foreground"
									style={{ fontFamily: "var(--font-satoshi)" }}
								>
									{agent.name}
								</span>
								<span className="text-[10px] text-muted-foreground">
									{agent.role ?? "Agente"}
								</span>
							</div>
						</div>

						{/* Properties slide-in absolute */}
						<aside
							aria-hidden={!propertiesOpen}
							className={cn(
								"pointer-events-auto absolute top-0 right-0 bottom-0 z-20 w-[340px]",
								"transition-transform duration-300 ease-out",
								propertiesOpen
									? "translate-x-0"
									: "translate-x-[calc(100%+1rem)]",
							)}
						>
							<div className={cn(PANEL_CLASSES, "h-full")}>
								<PropertiesPanel
									section={section}
									agent={agent}
									onClose={() => setPropertiesOpen(false)}
								/>
							</div>
						</aside>
					</div>

					{/* Logs colado embaixo da coluna direita */}
					<CollapsiblePanel
						open={logsOpen}
						onToggle={() => setLogsOpen(!logsOpen)}
						title="Logs ao vivo (sandbox)"
						icon={TerminalSquareIcon}
					>
						<div className="h-full overflow-y-auto p-3 font-mono text-[11px]">
							<p className="text-muted-foreground italic">
								Phase 11.3.3 — execução em tempo real (tool calls, scores,
								tokens).
							</p>
						</div>
					</CollapsiblePanel>
				</div>
			</div>
		</div>
	);
}

function CollapsiblePanel({
	open,
	onToggle,
	title,
	icon: Icon,
	children,
}: {
	open: boolean;
	onToggle: () => void;
	title: string;
	icon: typeof MessageSquareIcon;
	children: React.ReactNode;
}) {
	return (
		<section
			className={cn(
				PANEL_CLASSES,
				"flex shrink-0 flex-col transition-[height] duration-300 ease-out",
				open ? "h-52" : "h-9",
			)}
		>
			<button
				type="button"
				onClick={onToggle}
				className="flex h-9 shrink-0 items-center justify-between gap-2 px-4 py-2 text-left"
			>
				<span className="flex items-center gap-2">
					<Icon className="size-3.5 text-muted-foreground" />
					<span
						className="font-medium text-[12px] text-foreground"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						{title}
					</span>
				</span>
				{open ? (
					<ChevronDownIcon className="size-3.5 text-muted-foreground" />
				) : (
					<ChevronUpIcon className="size-3.5 text-muted-foreground" />
				)}
			</button>
			<div
				className={cn(
					"flex-1 overflow-hidden border-border/40 border-t transition-opacity duration-200",
					open ? "opacity-100 delay-100" : "pointer-events-none opacity-0",
				)}
			>
				{children}
			</div>
		</section>
	);
}

function PropertiesPanel({
	section,
	agent,
	onClose,
}: {
	section: Section;
	agent: Agent;
	onClose: () => void;
}) {
	const labels: Record<Section, string> = {
		persona: "Persona",
		model: "Modelo",
		memory: "Memória",
		modes: "Modos contextuais",
		tools: "Ferramentas",
		deploy: "Publicar",
	};

	return (
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 items-center justify-between gap-2 border-border/40 border-b px-4 py-2.5">
				<span
					className="font-medium text-[13px] text-foreground"
					style={{ fontFamily: "var(--font-satoshi)" }}
				>
					{labels[section]}
				</span>
				<button
					type="button"
					onClick={onClose}
					className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					<XIcon className="size-3.5" />
				</button>
			</div>
			<div className="flex-1 overflow-y-auto p-4">
				<SectionForm section={section} agent={agent} />
			</div>
		</div>
	);
}

function SectionForm({ section, agent }: { section: Section; agent: Agent }) {
	if (section === "model") {
		return (
			<div className="flex flex-col gap-3 text-[12px]">
				<KV label="Modelo" value={agent.model} />
				<KV label="Temperatura" value={agent.temperature.toFixed(2)} />
				<KV label="Max steps" value={String(agent.maxSteps)} />
				<p className="mt-2 text-[11px] text-muted-foreground italic">
					Editor de modelo chega na próxima iteração.
				</p>
			</div>
		);
	}
	return (
		<div className="rounded-lg bg-muted/30 p-4 text-center">
			<p className="text-[11.5px] text-muted-foreground">
				Editor desta seção chega na próxima iteração.
			</p>
		</div>
	);
}

function KV({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-2">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-mono text-foreground/90">{value}</span>
		</div>
	);
}
