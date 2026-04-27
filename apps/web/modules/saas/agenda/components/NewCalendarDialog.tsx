"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { cn } from "@ui/lib";
import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCalendarAction } from "../lib/actions";
import {
	CALENDAR_COLOR_OPTIONS,
	type CalendarTypeKey,
} from "../types";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	organizationSlug: string;
};

const TYPE_LABELS: Record<CalendarTypeKey, string> = {
	personal: "Pessoal",
	work: "Trabalho",
	shared: "Compartilhado",
};

export function NewCalendarDialog({
	open,
	onOpenChange,
	organizationId,
	organizationSlug,
}: Props) {
	const [name, setName] = useState("");
	const [color, setColor] = useState<string>("bg-blue-500");
	const [type, setType] = useState<CalendarTypeKey>("personal");
	const [isPending, startTransition] = useTransition();

	const reset = () => {
		setName("");
		setColor("bg-blue-500");
		setType("personal");
	};

	const handleSave = () => {
		if (!name.trim()) {
			toast.error("Dê um nome pro calendário.");
			return;
		}
		startTransition(async () => {
			try {
				await createCalendarAction(
					{ organizationId, name: name.trim(), color, type },
					organizationSlug,
				);
				toast.success("Calendário criado");
				reset();
				onOpenChange(false);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Falha ao criar");
			}
		});
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) reset();
				onOpenChange(v);
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Novo calendário</DialogTitle>
					<DialogDescription>
						Crie um calendário pra agrupar eventos (ex: Reuniões, Pessoal, Equipe).
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="cal-name">Nome</Label>
						<Input
							id="cal-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ex: Reuniões"
							maxLength={80}
							autoFocus
						/>
					</div>

					<div className="space-y-2">
						<Label>Cor</Label>
						<div className="flex flex-wrap gap-2">
							{CALENDAR_COLOR_OPTIONS.map((c) => (
								<button
									key={c}
									type="button"
									onClick={() => setColor(c)}
									className={cn(
										"size-8 rounded-full transition-transform",
										c,
										color === c
											? "ring-2 ring-primary ring-offset-2"
											: "hover:scale-110",
									)}
									aria-label={c}
								/>
							))}
						</div>
					</div>

					<div className="space-y-2">
						<Label>Tipo</Label>
						<Select
							value={type}
							onValueChange={(v) => setType(v as CalendarTypeKey)}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(TYPE_LABELS).map(([k, l]) => (
									<SelectItem key={k} value={k}>
										{l}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex gap-3 pt-2">
						<Button
							onClick={handleSave}
							disabled={isPending}
							className="flex-1"
						>
							{isPending ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : (
								"Criar calendário"
							)}
						</Button>
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Cancelar
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
