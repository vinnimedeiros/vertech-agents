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
import { Switch } from "@ui/components/switch";
import { Loader2Icon, UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ViewState } from "../lib/view-filters";
import { createPipelineViewAction } from "../lib/actions-views";

type SaveViewDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pipelineId: string;
	organizationSlug: string;
	currentState: ViewState;
	onCreated?: (viewId: string) => void;
};

export function SaveViewDialog({
	open,
	onOpenChange,
	pipelineId,
	organizationSlug,
	currentState,
	onCreated,
}: SaveViewDialogProps) {
	const [name, setName] = useState("");
	const [isShared, setIsShared] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) {
			setName("");
			setIsShared(false);
			setSaving(false);
		}
	}, [open]);

	async function handleSave() {
		if (!name.trim()) {
			toast.error("Informe um nome para a visão");
			return;
		}
		setSaving(true);
		try {
			const created = await createPipelineViewAction(
				{
					pipelineId,
					name: name.trim(),
					filters: currentState.filters,
					viewMode: currentState.viewMode,
					sortBy: currentState.sortBy,
					isShared,
				},
				organizationSlug,
			);
			toast.success(`Visão "${created.name}" salva`);
			onCreated?.(created.id);
			onOpenChange(false);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Não foi possível salvar a visão",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Salvar visão</DialogTitle>
					<DialogDescription>
						Uma visão guarda filtros, ordenação e modo de exibição.
						Clique na aba salva a qualquer momento pra voltar pra este estado.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="view-name">Nome</Label>
						<Input
							id="view-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ex: Meus leads quentes"
							autoFocus
							maxLength={80}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !saving) handleSave();
							}}
						/>
					</div>

					<div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
						<UsersIcon className="mt-0.5 size-4 text-muted-foreground" />
						<div className="flex-1 space-y-0.5">
							<Label
								htmlFor="view-shared"
								className="cursor-pointer text-sm"
							>
								Compartilhar com a equipe
							</Label>
							<p className="text-xs text-muted-foreground">
								Todos os membros do workspace poderão usar essa visão.
								Só você poderá editá-la ou excluí-la.
							</p>
						</div>
						<Switch
							id="view-shared"
							checked={isShared}
							onCheckedChange={setIsShared}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={saving}
					>
						Cancelar
					</Button>
					<Button type="button" onClick={handleSave} disabled={saving}>
						{saving && <Loader2Icon className="mr-2 size-3.5 animate-spin" />}
						Salvar visão
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
