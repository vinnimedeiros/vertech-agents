"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updatePipelineViewAction } from "../lib/actions-views";

type RenameViewDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	viewId: string;
	currentName: string;
	organizationSlug: string;
};

export function RenameViewDialog({
	open,
	onOpenChange,
	viewId,
	currentName,
	organizationSlug,
}: RenameViewDialogProps) {
	const [name, setName] = useState(currentName);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) {
			setName(currentName);
			setSaving(false);
		}
	}, [open, currentName]);

	async function handleSave() {
		const trimmed = name.trim();
		if (!trimmed) {
			toast.error("Informe um nome");
			return;
		}
		if (trimmed === currentName) {
			onOpenChange(false);
			return;
		}
		setSaving(true);
		try {
			await updatePipelineViewAction(
				{ viewId, name: trimmed },
				organizationSlug,
			);
			toast.success("Visão renomeada");
			onOpenChange(false);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Não foi possível renomear",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Renomear visão</DialogTitle>
				</DialogHeader>
				<div className="space-y-1.5 py-2">
					<Label htmlFor="rename-view">Nome</Label>
					<Input
						id="rename-view"
						value={name}
						onChange={(e) => setName(e.target.value)}
						autoFocus
						maxLength={80}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !saving) handleSave();
						}}
					/>
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
						Salvar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
