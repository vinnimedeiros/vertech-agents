"use client";

import { Button } from "@ui/components/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Slider } from "@ui/components/slider";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	BotIcon,
	BrainIcon,
	CheckCircle2Icon,
	Loader2Icon,
	RocketIcon,
	WrenchIcon,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
	updateAgentModelAction,
	updateAgentPersonaAction,
} from "../lib/actions";
import { studioToasts } from "../lib/studio-toasts";

export type EditorAgent = {
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

// =============================================
// Persona
// =============================================

const personaSchema = z.object({
	name: z.string().min(1, "Nome obrigatório").max(120),
	role: z.string().max(120).optional(),
	description: z.string().max(2000).optional(),
	gender: z.enum(["FEMININE", "MASCULINE", "NEUTRAL"]).optional(),
});

type PersonaValues = z.infer<typeof personaSchema>;

export function PersonaForm({ agent }: { agent: EditorAgent }) {
	const [submitting, setSubmitting] = useState(false);
	const form = useForm<PersonaValues>({
		resolver: zodResolver(personaSchema),
		defaultValues: {
			name: agent.name,
			role: agent.role ?? "",
			description: agent.description ?? "",
			gender:
				(agent.gender as "FEMININE" | "MASCULINE" | "NEUTRAL" | undefined) ??
				undefined,
		},
	});

	const onSubmit = async (values: PersonaValues) => {
		setSubmitting(true);
		try {
			const res = await updateAgentPersonaAction({
				agentId: agent.id,
				name: values.name,
				role: values.role || null,
				description: values.description || null,
				gender: values.gender ?? null,
			});
			if (res.ok) {
				studioToasts.saveSuccess();
				form.reset(values);
			} else {
				studioToasts.saveError();
			}
		} catch {
			studioToasts.unknownError();
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn(
					"flex flex-col gap-3",
					submitting && "pointer-events-none opacity-70",
				)}
			>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
								Nome do agente
							</FormLabel>
							<FormControl>
								<Input {...field} className="h-8 text-[13px]" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="role"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
								Papel
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className="h-8 text-[13px]"
									placeholder="Atendente comercial"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="gender"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
								Gênero da persona
							</FormLabel>
							<Select
								value={field.value ?? ""}
								onValueChange={(v) =>
									field.onChange(v === "" ? undefined : v)
								}
							>
								<FormControl>
									<SelectTrigger className="h-8 text-[13px]">
										<SelectValue placeholder="Selecionar" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="FEMININE">Feminina</SelectItem>
									<SelectItem value="MASCULINE">Masculina</SelectItem>
									<SelectItem value="NEUTRAL">Neutra</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
								Descrição
							</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									rows={4}
									className="text-[13px]"
									placeholder="Como o agente se apresenta e atua..."
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button
					type="submit"
					size="sm"
					disabled={submitting || !form.formState.isDirty}
					className="ml-auto h-8 text-[12px]"
				>
					{submitting ? (
						<Loader2Icon className="size-3.5 animate-spin" />
					) : (
						"Salvar persona"
					)}
				</Button>
			</form>
		</Form>
	);
}

// =============================================
// Modelo
// =============================================

const modelSchema = z.object({
	model: z.string().min(1),
	temperature: z.number().min(0).max(1),
	maxSteps: z.number().int().min(1).max(30),
});

type ModelValues = z.infer<typeof modelSchema>;

const MODEL_OPTIONS = [
	{ value: "openai/gpt-4.1-mini", label: "OpenAI · GPT-4.1 Mini" },
	{ value: "openai/gpt-4o", label: "OpenAI · GPT-4o" },
	{ value: "openai/gpt-4o-mini", label: "OpenAI · GPT-4o Mini" },
	{ value: "anthropic/claude-sonnet-4-6", label: "Anthropic · Sonnet 4.6" },
	{ value: "anthropic/claude-opus-4-7", label: "Anthropic · Opus 4.7" },
	{ value: "anthropic/claude-haiku-4-5", label: "Anthropic · Haiku 4.5" },
];

export function ModelForm({ agent }: { agent: EditorAgent }) {
	const [submitting, setSubmitting] = useState(false);
	const form = useForm<ModelValues>({
		resolver: zodResolver(modelSchema),
		defaultValues: {
			model: agent.model,
			temperature: agent.temperature,
			maxSteps: agent.maxSteps,
		},
	});

	const onSubmit = async (values: ModelValues) => {
		setSubmitting(true);
		try {
			const res = await updateAgentModelAction({
				agentId: agent.id,
				...values,
			});
			if (res.ok) {
				studioToasts.saveSuccess();
				form.reset(values);
			} else {
				studioToasts.saveError();
			}
		} catch {
			studioToasts.unknownError();
		} finally {
			setSubmitting(false);
		}
	};

	const tempVal = form.watch("temperature");
	const stepsVal = form.watch("maxSteps");

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn(
					"flex flex-col gap-4",
					submitting && "pointer-events-none opacity-70",
				)}
			>
				<FormField
					control={form.control}
					name="model"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
								Modelo (LLM)
							</FormLabel>
							<Select value={field.value} onValueChange={field.onChange}>
								<FormControl>
									<SelectTrigger className="h-8 text-[13px]">
										<SelectValue />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{MODEL_OPTIONS.map((opt) => (
										<SelectItem
											key={opt.value}
											value={opt.value}
											className="text-[13px]"
										>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="temperature"
					render={({ field }) => (
						<FormItem>
							<div className="flex items-baseline justify-between">
								<FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
									Temperatura
								</FormLabel>
								<span className="font-mono text-[12px] text-foreground/80 tabular-nums">
									{tempVal.toFixed(2)}
								</span>
							</div>
							<FormControl>
								<Slider
									min={0}
									max={1}
									step={0.05}
									value={[field.value]}
									onValueChange={(v) => field.onChange(v[0] ?? 0)}
								/>
							</FormControl>
							<p className="text-[10.5px] text-muted-foreground">
								Mais baixo = respostas previsíveis. Mais alto = criatividade.
							</p>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="maxSteps"
					render={({ field }) => (
						<FormItem>
							<div className="flex items-baseline justify-between">
								<FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
									Máx passos por turno
								</FormLabel>
								<span className="font-mono text-[12px] text-foreground/80 tabular-nums">
									{stepsVal}
								</span>
							</div>
							<FormControl>
								<Slider
									min={1}
									max={30}
									step={1}
									value={[field.value]}
									onValueChange={(v) => field.onChange(v[0] ?? 1)}
								/>
							</FormControl>
							<p className="text-[10.5px] text-muted-foreground">
								Quantas chamadas de ferramenta o agente pode encadear antes de
								responder.
							</p>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button
					type="submit"
					size="sm"
					disabled={submitting || !form.formState.isDirty}
					className="ml-auto h-8 text-[12px]"
				>
					{submitting ? (
						<Loader2Icon className="size-3.5 animate-spin" />
					) : (
						"Salvar modelo"
					)}
				</Button>
			</form>
		</Form>
	);
}

// =============================================
// Memória (read-only)
// =============================================

export function MemoryView() {
	const items = [
		{ label: "Working Memory", value: "ativada", note: "schema Zod" },
		{
			label: "Semantic Memory",
			value: "ativada",
			note: "pgvector cosine, threshold 0.65",
		},
		{
			label: "Observational Memory",
			value: "ativada",
			note: "compressão via gemini-flash",
		},
		{ label: "Embedder", value: "OpenAI text-embedding-3-small", note: "" },
	];
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
				<BrainIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
				<p className="text-[11.5px] text-muted-foreground leading-relaxed">
					Memória do agente é configurada no servidor (Mastra). Edição via
					painel chega quando o ajuste fino for liberado pra agência.
				</p>
			</div>
			<dl className="flex flex-col gap-2 text-[12.5px]">
				{items.map((it) => (
					<div
						key={it.label}
						className="flex items-baseline justify-between gap-2 border-border/30 border-b py-1.5"
					>
						<dt className="text-muted-foreground">{it.label}</dt>
						<dd className="text-right">
							<div className="font-mono text-foreground/90">{it.value}</div>
							{it.note ? (
								<div className="text-[10.5px] text-muted-foreground/70">
									{it.note}
								</div>
							) : null}
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

// =============================================
// Modos contextuais
// =============================================

export function ModesView({ agent }: { agent: EditorAgent }) {
	const isSupervisor = (agent.role ?? "").toLowerCase().includes("atendente");

	if (!isSupervisor) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-xl bg-muted/30 px-4 py-10 text-center">
				<div className="flex size-10 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-foreground/10">
					<BotIcon className="size-4 text-muted-foreground" />
				</div>
				<p className="max-w-xs text-[12px] text-muted-foreground leading-relaxed">
					Modos contextuais são exclusivos do Atendente (Supervisor do TIME).
				</p>
			</div>
		);
	}

	const modes = [
		{
			key: "sdr",
			label: "SDR",
			description: "Qualificação inicial: dor, vertical, momento, decisor",
		},
		{
			key: "closer",
			label: "Closer",
			description: "Fechamento: tira objeção, propõe plano, agenda",
		},
		{
			key: "pos-venda",
			label: "Pós-venda",
			description: "Relacionamento: dúvidas, reclamação, upsell sutil",
		},
	];

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
				<BotIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
				<p className="text-[11.5px] text-muted-foreground leading-relaxed">
					3 modos com mesma identidade. O sistema alterna sozinho conforme o
					estágio do lead. Edição por modo chega quando o schema for ampliado.
				</p>
			</div>
			<div className="flex flex-col gap-2">
				{modes.map((m) => (
					<div
						key={m.key}
						className="flex flex-col gap-1 rounded-lg border border-border/40 bg-card/40 px-3 py-2"
					>
						<div
							className="font-medium text-[13px] text-foreground"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							{m.label}
						</div>
						<div className="text-[11.5px] text-muted-foreground leading-relaxed">
							{m.description}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// =============================================
// Publicar (validação client-side)
// =============================================

type DeployIssue = { kind: "blocker" | "warning"; message: string };

function computeDeployIssues(agent: EditorAgent): DeployIssue[] {
	const issues: DeployIssue[] = [];
	if (!agent.name.trim()) {
		issues.push({ kind: "blocker", message: "Nome do agente está vazio" });
	}
	if (!agent.model || !agent.model.includes("/")) {
		issues.push({
			kind: "blocker",
			message: "Modelo (LLM) não está configurado",
		});
	}
	if (!agent.enabledTools || agent.enabledTools.length === 0) {
		issues.push({
			kind: "warning",
			message: "Nenhuma ferramenta habilitada para este agente",
		});
	}
	if (!agent.knowledgeDocIds || agent.knowledgeDocIds.length === 0) {
		issues.push({
			kind: "warning",
			message: "Sem documentos de conhecimento (RAG)",
		});
	}
	return issues;
}

export function DeployView({ agent }: { agent: EditorAgent }) {
	const issues = computeDeployIssues(agent);
	const blockers = issues.filter((i) => i.kind === "blocker");
	const warnings = issues.filter((i) => i.kind === "warning");

	const handleActivate = () => {
		if (blockers.length > 0) {
			studioToasts.deployBlocked();
			return;
		}
		studioToasts.deployReady();
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
				<RocketIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
				<p className="text-[11.5px] text-muted-foreground leading-relaxed">
					Validação local. A ativação real do TIME no WhatsApp chega na fase
					seguinte.
				</p>
			</div>

			{issues.length === 0 ? (
				<div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-300">
					<CheckCircle2Icon className="size-3.5" />
					Pronto para ativar.
				</div>
			) : (
				<ul className="flex flex-col gap-1.5">
					{issues.map((i) => (
						<li
							key={i.message}
							className={cn(
								"rounded-lg border px-3 py-1.5 text-[12px]",
								i.kind === "blocker"
									? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
									: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
							)}
						>
							{i.kind === "blocker" ? "Bloqueio: " : "Atenção: "}
							{i.message}
						</li>
					))}
				</ul>
			)}

			<Button
				type="button"
				size="sm"
				onClick={handleActivate}
				disabled={blockers.length > 0}
				className="ml-auto h-8 text-[12px]"
			>
				<RocketIcon className="size-3.5" />
				Ativar TIME
			</Button>

			{warnings.length > 0 && blockers.length === 0 ? (
				<p className="text-[10.5px] text-muted-foreground">
					Pode ativar mesmo com avisos, mas o desempenho será limitado.
				</p>
			) : null}
		</div>
	);
}

// =============================================
// Ferramentas (placeholder Phase 11.2.2)
// =============================================

export function ToolsPlaceholder() {
	return (
		<div className="flex flex-col items-center gap-3 rounded-xl bg-muted/30 px-4 py-10 text-center">
			<div className="flex size-10 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-foreground/10">
				<WrenchIcon className="size-4 text-muted-foreground" />
			</div>
			<div className="flex flex-col gap-1">
				<p
					className="font-medium text-[13px] text-foreground"
					style={{ fontFamily: "var(--font-satoshi)" }}
				>
					Painel de ferramentas em construção
				</p>
				<p className="max-w-xs text-[11.5px] text-muted-foreground leading-relaxed">
					Chega na próxima iteração com o resultado da auditoria do setor
					comercial.
				</p>
			</div>
		</div>
	);
}
