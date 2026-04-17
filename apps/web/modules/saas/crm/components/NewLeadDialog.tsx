"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import { Textarea } from "@ui/components/textarea";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { createContactAction, createLeadAction } from "../lib/actions";

type StageOption = {
	id: string;
	name: string;
	isClosing: boolean;
	position: number;
};

type NewLeadDialogProps = {
	organizationId: string;
	organizationSlug: string;
	pipelineId: string;
	stages: StageOption[];
	defaultStageId?: string;
	trigger?: ReactNode;
};

const TEMPERATURES = [
	{ value: "COLD", label: "Frio" },
	{ value: "WARM", label: "Morno" },
	{ value: "HOT", label: "Quente" },
] as const;

const PRIORITIES = [
	{ value: "LOW", label: "Baixa" },
	{ value: "NORMAL", label: "Normal" },
	{ value: "HIGH", label: "Alta" },
	{ value: "URGENT", label: "Urgente" },
] as const;

export function NewLeadDialog({
	organizationId,
	organizationSlug,
	pipelineId,
	stages,
	defaultStageId,
	trigger,
}: NewLeadDialogProps) {
	const firstOpenStage =
		defaultStageId ??
		stages.find((s) => !s.isClosing)?.id ??
		stages[0]?.id ??
		"";

	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [company, setCompany] = useState("");
	const [stageId, setStageId] = useState(firstOpenStage);
	const [title, setTitle] = useState("");
	const [value, setValue] = useState("");
	const [temperature, setTemperature] =
		useState<(typeof TEMPERATURES)[number]["value"]>("COLD");
	const [priority, setPriority] =
		useState<(typeof PRIORITIES)[number]["value"]>("NORMAL");
	const [origin, setOrigin] = useState("");
	const [description, setDescription] = useState("");

	function resetForm() {
		setName("");
		setPhone("");
		setEmail("");
		setCompany("");
		setStageId(firstOpenStage);
		setTitle("");
		setValue("");
		setTemperature("COLD");
		setPriority("NORMAL");
		setOrigin("");
		setDescription("");
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		if (!name.trim()) {
			toast.error("Informe o nome do contato");
			return;
		}
		if (!stageId) {
			toast.error("Selecione um estágio");
			return;
		}

		const numericValue = value.trim() === "" ? null : Number(value);
		if (numericValue !== null && Number.isNaN(numericValue)) {
			toast.error("Valor inválido");
			return;
		}

		startTransition(async () => {
			try {
				const contact = await createContactAction(
					{
						organizationId,
						name: name.trim(),
						phone: phone.trim() || null,
						email: email.trim() || null,
						company: company.trim() || null,
					},
					organizationSlug,
				);

				await createLeadAction(
					{
						organizationId,
						contactId: contact.id,
						pipelineId,
						stageId,
						title: title.trim() || null,
						description: description.trim() || null,
						value: numericValue,
						currency: "BRL",
						temperature,
						priority,
						origin: origin.trim() || null,
					},
					organizationSlug,
				);

				toast.success("Lead criado");
				resetForm();
				setOpen(false);
			} catch (err) {
				toast.error("Não foi possível criar o lead", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button size="sm">
						<PlusIcon className="size-4" />
						Novo lead
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Novo lead</DialogTitle>
					<DialogDescription>
						Cadastre um contato e já abra a oportunidade no
						pipeline.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<section className="space-y-3">
						<h3 className="text-foreground/60 text-xs uppercase tracking-wide">
							Contato
						</h3>
						<div className="space-y-2">
							<Label htmlFor="new-lead-name">Nome *</Label>
							<Input
								id="new-lead-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Nome completo"
								autoFocus
								required
							/>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-2">
								<Label htmlFor="new-lead-phone">Telefone</Label>
								<Input
									id="new-lead-phone"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="(11) 99999-9999"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="new-lead-email">Email</Label>
								<Input
									id="new-lead-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="email@exemplo.com"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-lead-company">Empresa</Label>
							<Input
								id="new-lead-company"
								value={company}
								onChange={(e) => setCompany(e.target.value)}
								placeholder="Opcional"
							/>
						</div>
					</section>

					<section className="space-y-3">
						<h3 className="text-foreground/60 text-xs uppercase tracking-wide">
							Oportunidade
						</h3>
						<div className="space-y-2">
							<Label htmlFor="new-lead-title">Título</Label>
							<Input
								id="new-lead-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Ex: Proposta de consultoria"
							/>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-2">
								<Label htmlFor="new-lead-stage">
									Estágio inicial *
								</Label>
								<Select
									value={stageId}
									onValueChange={setStageId}
								>
									<SelectTrigger id="new-lead-stage">
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										{stages.map((s) => (
											<SelectItem key={s.id} value={s.id}>
												{s.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="new-lead-value">
									Valor (R$)
								</Label>
								<Input
									id="new-lead-value"
									type="number"
									inputMode="decimal"
									min="0"
									step="0.01"
									value={value}
									onChange={(e) => setValue(e.target.value)}
									placeholder="0,00"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-2">
								<Label htmlFor="new-lead-temperature">
									Temperatura
								</Label>
								<Select
									value={temperature}
									onValueChange={(v) =>
										setTemperature(v as typeof temperature)
									}
								>
									<SelectTrigger id="new-lead-temperature">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TEMPERATURES.map((t) => (
											<SelectItem
												key={t.value}
												value={t.value}
											>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="new-lead-priority">
									Prioridade
								</Label>
								<Select
									value={priority}
									onValueChange={(v) =>
										setPriority(v as typeof priority)
									}
								>
									<SelectTrigger id="new-lead-priority">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PRIORITIES.map((p) => (
											<SelectItem
												key={p.value}
												value={p.value}
											>
												{p.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-lead-origin">Origem</Label>
							<Input
								id="new-lead-origin"
								value={origin}
								onChange={(e) => setOrigin(e.target.value)}
								placeholder="Ex: WhatsApp, Instagram, Indicação"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-lead-description">
								Descrição
							</Label>
							<Textarea
								id="new-lead-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Contexto, necessidades, observações…"
								rows={3}
							/>
						</div>
					</section>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isPending}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : null}
							Criar lead
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
