"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Switch } from "@ui/components/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ui/components/tabs";
import { cn } from "@ui/lib";
import { Loader2Icon, MessageSquareIcon, SparklesIcon, UserIcon, WrenchIcon, XIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { applyStatusTemplateAction } from "../../lib/actions-templates";
import type { StatusTemplateRow } from "../../lib/server";
import { TemplateStageList } from "./TemplateStageList";
import { TemplateVerticalIcon } from "./TemplateVerticalIcon";

type TemplatePreviewModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	template: StatusTemplateRow;
	organizationId: string;
	organizationSlug: string;
	onApplied?: (pipelineId: string) => void;
};

export function TemplatePreviewModal({
	open,
	onOpenChange,
	template,
	organizationId,
	organizationSlug,
	onApplied,
}: TemplatePreviewModalProps) {
	const [pipelineName, setPipelineName] = useState(template.name);
	const [setAsDefault, setSetAsDefault] = useState(false);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (open) {
			setPipelineName(template.name);
			setSetAsDefault(false);
		}
	}, [open, template.name]);

	const suggestedAgent = template.metadata?.suggestedAgent;

	function handleApply() {
		if (!pipelineName.trim()) {
			toast.error("Informe um nome pro pipeline");
			return;
		}
		const name = pipelineName.trim();
		startTransition(async () => {
			try {
				const result = await applyStatusTemplateAction(
					{
						templateId: template.id,
						organizationId,
						pipelineName: name,
						isDefault: setAsDefault,
					},
					organizationSlug,
				);
				toast.success(`Pipeline "${result.pipelineName}" criado`);
				onApplied?.(result.pipelineId);
			} catch (err) {
				toast.error("Não foi possível criar o pipeline", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="flex max-h-[85vh] w-[95vw] max-w-[900px] flex-col gap-0 overflow-hidden p-0"
				showCloseButton={false}
				onInteractOutside={(e) => {
					const target = e.target as HTMLElement | null;
					if (target?.closest("[data-radix-popper-content-wrapper]"))
						e.preventDefault();
				}}
			>
				<DialogTitle className="sr-only">
					Detalhes do template {template.name}
				</DialogTitle>

				<header className="flex items-start justify-between gap-3 border-b px-6 py-4">
					<div className="flex items-start gap-3">
						<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<TemplateVerticalIcon
								iconKey={template.metadata?.iconKey}
								className="size-5"
							/>
						</div>
						<div>
							<h2 className="font-semibold text-lg">{template.name}</h2>
							{template.vertical && (
								<p className="text-xs text-foreground/50 uppercase tracking-wider">
									{template.vertical.replace(/-/g, " ")}
								</p>
							)}
						</div>
					</div>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="flex size-8 items-center justify-center rounded text-foreground/60 hover:bg-muted hover:text-foreground"
						aria-label="Fechar"
					>
						<XIcon className="size-4" />
					</button>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto">
					<Tabs defaultValue="detalhes" className="flex flex-col">
						<TabsList className="mx-6 mt-4 w-fit">
							<TabsTrigger value="detalhes">Detalhes</TabsTrigger>
							<TabsTrigger value="customizar">Customizar</TabsTrigger>
							{suggestedAgent && (
								<TabsTrigger value="agente">Agente sugerido</TabsTrigger>
							)}
						</TabsList>

						<TabsContent value="detalhes" className="space-y-5 px-6 py-4">
							{template.description && (
								<p className="text-sm text-foreground/80">
									{template.description}
								</p>
							)}

							<div className="space-y-2">
								<h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
									{template.stages.length} etapas do funil
								</h4>
								<div className="rounded-lg border bg-muted/20 p-4">
									<TemplateStageList stages={template.stages} />
								</div>
							</div>

							{suggestedAgent && (
								<div className="space-y-2">
									<h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
										Agente comercial sugerido
									</h4>
									<p className="text-sm text-foreground/70">
										<span className="font-medium">
											{suggestedAgent.persona}
										</span>{" "}
										— {suggestedAgent.tone}
									</p>
									<p className="text-xs text-foreground/50">
										Veja a aba "Agente sugerido" pros detalhes.
									</p>
								</div>
							)}
						</TabsContent>

						<TabsContent value="customizar" className="space-y-5 px-6 py-4">
							<div className="space-y-1.5">
								<Label htmlFor="tpl-name">Nome do novo pipeline</Label>
								<Input
									id="tpl-name"
									value={pipelineName}
									onChange={(e) => setPipelineName(e.target.value)}
									placeholder="Ex: Funil Principal"
									maxLength={80}
								/>
							</div>

							<div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
								<SparklesIcon className="mt-0.5 size-4 text-muted-foreground" />
								<div className="flex-1 space-y-0.5">
									<Label
										htmlFor="tpl-default"
										className="cursor-pointer text-sm"
									>
										Tornar pipeline principal
									</Label>
									<p className="text-xs text-muted-foreground">
										Será o pipeline padrão ao abrir o CRM. Você pode trocar depois.
									</p>
								</div>
								<Switch
									id="tpl-default"
									checked={setAsDefault}
									onCheckedChange={setSetAsDefault}
								/>
							</div>

							<p className="text-xs text-muted-foreground">
								Você poderá editar etapas, cores, prazos e probabilidades depois
								no editor de estágios.
							</p>
						</TabsContent>

						{suggestedAgent && (
							<TabsContent
								value="agente"
								className="space-y-4 px-6 py-4"
							>
								<div className="rounded-lg border bg-muted/20 p-4">
									<div className="flex items-start gap-3">
										<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-500">
											<UserIcon className="size-4" />
										</div>
										<div className="flex-1">
											<p className="font-medium text-sm">
												{suggestedAgent.persona}
											</p>
											<p className="mt-0.5 text-xs text-foreground/60">
												{suggestedAgent.tone}
											</p>
										</div>
									</div>
								</div>

								<div>
									<h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
										<MessageSquareIcon className="size-3" />
										Mensagem de abertura
									</h4>
									<div className="rounded-lg border-l-2 border-primary/60 bg-muted/30 px-4 py-3 text-sm italic text-foreground/80">
										"{suggestedAgent.openingMessage}"
									</div>
								</div>

								<div>
									<h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
										<WrenchIcon className="size-3" />
										Ferramentas que o agente usará
									</h4>
									<div className="flex flex-wrap gap-1.5">
										{suggestedAgent.tools.map((tool) => (
											<span
												key={tool}
												className="inline-flex items-center rounded-md border border-border/60 bg-muted/50 px-2 py-1 font-mono text-[11px] text-foreground/70"
											>
												{tool}
											</span>
										))}
									</div>
								</div>

								<div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
									<p className="font-medium text-foreground/70">
										Preview informativo
									</p>
									<p className="mt-0.5">
										O agente comercial será configurável na Phase 09 (Agent
										Builder). Essas são as sugestões pré-configuradas pro
										vertical "{template.vertical}".
									</p>
								</div>
							</TabsContent>
						)}
					</Tabs>
				</div>

				<footer className="flex items-center justify-end gap-2 border-t px-6 py-3">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={handleApply}
						disabled={isPending || !pipelineName.trim()}
					>
						{isPending && <Loader2Icon className="mr-2 size-3.5 animate-spin" />}
						Aplicar como novo pipeline
					</Button>
				</footer>
			</DialogContent>
		</Dialog>
	);
}
