"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import { Loader2Icon, UsersIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveAsTemplateAction } from "../../lib/actions-templates";
import { KNOWN_VERTICALS } from "../../lib/status-templates-data";

type SaveAsTemplateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pipelineId: string;
	pipelineName: string;
	organizationSlug: string;
	onSaved?: () => void;
};

export function SaveAsTemplateDialog({
	open,
	onOpenChange,
	pipelineId,
	pipelineName,
	organizationSlug,
	onSaved,
}: SaveAsTemplateDialogProps) {
	const [name, setName] = useState(pipelineName);
	const [description, setDescription] = useState("");
	const [vertical, setVertical] = useState("outro");
	const [isPublic, setIsPublic] = useState(false);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (open) {
			setName(pipelineName);
			setDescription("");
			setVertical("outro");
			setIsPublic(false);
		}
	}, [open, pipelineName]);

	function handleSave() {
		if (!name.trim()) {
			toast.error("Informe um nome pro template");
			return;
		}
		const templateName = name.trim();
		const templateDescription = description.trim();
		startTransition(async () => {
			try {
				await saveAsTemplateAction(
					{
						pipelineId,
						name: templateName,
						description: templateDescription || null,
						vertical,
						isPublic,
					},
					organizationSlug,
				);
				toast.success(`Template "${templateName}" salvo`);
				onSaved?.();
				onOpenChange(false);
			} catch (err) {
				toast.error("Não foi possível salvar o template", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-lg"
				onInteractOutside={(e) => {
					const target = e.target as HTMLElement | null;
					if (target?.closest("[data-radix-popper-content-wrapper]"))
						e.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>Salvar pipeline como template</DialogTitle>
					<DialogDescription>
						Guarde as etapas deste pipeline como um template reutilizável. Os
						leads não são incluídos.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="tpl-save-name">Nome do template</Label>
						<Input
							id="tpl-save-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={80}
							placeholder="Ex: Funil Clínica Vertech"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="tpl-save-desc">Descrição (opcional)</Label>
						<Textarea
							id="tpl-save-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							maxLength={500}
							rows={2}
							placeholder="Quando usar esse template, cenário típico…"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="tpl-save-vertical">Vertical / Área</Label>
						<Select value={vertical} onValueChange={setVertical}>
							<SelectTrigger id="tpl-save-vertical">
								<SelectValue />
							</SelectTrigger>
							<SelectContent withPortal={false}>
								{KNOWN_VERTICALS.map((v) => (
									<SelectItem key={v.slug} value={v.slug}>
										{v.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
						<UsersIcon className="mt-0.5 size-4 text-muted-foreground" />
						<div className="flex-1 space-y-0.5">
							<Label
								htmlFor="tpl-save-public"
								className="cursor-pointer text-sm"
							>
								Disponibilizar em marketplace (futuro)
							</Label>
							<p className="text-xs text-muted-foreground">
								Mantendo desligado, só a sua organização pode usar.
							</p>
						</div>
						<Switch
							id="tpl-save-public"
							checked={isPublic}
							onCheckedChange={setIsPublic}
						/>
					</div>
				</div>

				<DialogFooter>
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
						onClick={handleSave}
						disabled={isPending || !name.trim()}
					>
						{isPending && <Loader2Icon className="mr-2 size-3.5 animate-spin" />}
						Salvar template
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
