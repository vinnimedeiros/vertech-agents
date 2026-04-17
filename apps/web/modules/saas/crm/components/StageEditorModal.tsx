"use client";

import {
	DndContext,
	type DragEndEvent,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Slider } from "@ui/components/slider";
import { cn } from "@ui/lib";
import {
	GripVerticalIcon,
	Loader2Icon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	createStageAction,
	deleteStageAction,
	reorderStagesAction,
	updateStageAction,
} from "../lib/actions-pipeline";
import { StageColorPicker } from "./StageColorPicker";

export type EditableStage = {
	id: string;
	name: string;
	color: string;
	position: number;
	category: "NOT_STARTED" | "ACTIVE" | "SCHEDULED" | "WON" | "LOST";
	probability: number;
	maxDays: number | null;
};

type StageEditorModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pipelineId: string;
	pipelineName: string;
	organizationSlug: string;
	stages: EditableStage[];
	/** pra dialog de migração: precisa saber quais stages têm leads */
	leadCountByStage?: Record<string, number>;
};

const CATEGORY_CONFIG = [
	{
		id: "NOT_STARTED" as const,
		label: "Entrada",
		description: "Onde novos leads chegam",
		color: "text-slate-500",
	},
	{
		id: "ACTIVE" as const,
		label: "Em andamento",
		description: "Oportunidades ativas no funil",
		color: "text-blue-500",
	},
	{
		id: "SCHEDULED" as const,
		label: "Agendado",
		description: "Disparam evento na agenda automaticamente",
		color: "text-cyan-500",
	},
	{
		id: "WON" as const,
		label: "Ganho",
		description: "Leads fechados com sucesso",
		color: "text-emerald-500",
	},
	{
		id: "LOST" as const,
		label: "Perdido",
		description: "Oportunidades não convertidas",
		color: "text-rose-500",
	},
];

export function StageEditorModal({
	open,
	onOpenChange,
	pipelineId,
	pipelineName,
	organizationSlug,
	stages: initialStages,
	leadCountByStage = {},
}: StageEditorModalProps) {
	const [stages, setStages] = useState<EditableStage[]>(initialStages);
	const [isPending, startTransition] = useTransition();
	const [deleteTarget, setDeleteTarget] = useState<EditableStage | null>(
		null,
	);
	const [migrateToStageId, setMigrateToStageId] = useState<string>("");

	// Sincroniza quando props mudam (revalidate refetch)
	useEffect(() => {
		setStages(initialStages);
	}, [initialStages]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	);

	const grouped = useMemo(() => {
		const map = new Map<EditableStage["category"], EditableStage[]>();
		for (const cat of CATEGORY_CONFIG) {
			map.set(cat.id, []);
		}
		for (const s of stages) {
			map.get(s.category)?.push(s);
		}
		// ordenar por position dentro de cada categoria
		map.forEach((arr) => {
			arr.sort((a, b) => a.position - b.position);
		});
		return map;
	}, [stages]);

	function updateLocal(stageId: string, changes: Partial<EditableStage>) {
		setStages((prev) =>
			prev.map((s) => (s.id === stageId ? { ...s, ...changes } : s)),
		);
	}

	function handleRename(stageId: string, newName: string) {
		const trimmed = newName.trim();
		if (!trimmed) return;
		const current = stages.find((s) => s.id === stageId);
		if (!current || current.name === trimmed) return;
		updateLocal(stageId, { name: trimmed });
		startTransition(async () => {
			try {
				await updateStageAction(
					{ stageId, name: trimmed },
					organizationSlug,
				);
			} catch (err) {
				updateLocal(stageId, { name: current.name });
				toast.error("Não foi possível renomear", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	function handleColorChange(stageId: string, color: string) {
		const current = stages.find((s) => s.id === stageId);
		if (!current) return;
		updateLocal(stageId, { color });
		startTransition(async () => {
			try {
				await updateStageAction({ stageId, color }, organizationSlug);
			} catch (err) {
				updateLocal(stageId, { color: current.color });
				toast.error("Não foi possível mudar a cor", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	function handleProbabilityChange(stageId: string, probability: number) {
		updateLocal(stageId, { probability });
	}

	function handleProbabilityCommit(stageId: string) {
		const current = stages.find((s) => s.id === stageId);
		if (!current) return;
		startTransition(async () => {
			try {
				await updateStageAction(
					{ stageId, probability: current.probability },
					organizationSlug,
				);
			} catch (err) {
				toast.error("Não foi possível atualizar a probabilidade", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	function handleMaxDaysChange(stageId: string, value: string) {
		const trimmed = value.trim();
		const maxDays =
			trimmed === "" ? null : Math.max(1, Number.parseInt(trimmed, 10));
		if (trimmed !== "" && (Number.isNaN(maxDays) || !maxDays)) return;
		updateLocal(stageId, { maxDays });
		startTransition(async () => {
			try {
				await updateStageAction(
					{ stageId, maxDays: maxDays ?? null },
					organizationSlug,
				);
			} catch (err) {
				toast.error("Não foi possível atualizar o SLA", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const activeStage = stages.find((s) => s.id === active.id);
		const overStage = stages.find((s) => s.id === over.id);
		if (!activeStage || !overStage) return;

		// Só permite reorder dentro da mesma categoria (mudança de categoria é via dropdown)
		if (activeStage.category !== overStage.category) return;

		const category = activeStage.category;
		const sameCat = stages
			.filter((s) => s.category === category)
			.sort((a, b) => a.position - b.position);
		const oldIdx = sameCat.findIndex((s) => s.id === active.id);
		const newIdx = sameCat.findIndex((s) => s.id === over.id);

		const reordered = arrayMove(sameCat, oldIdx, newIdx);
		const updatedPositions = reordered.map((s, idx) => ({
			...s,
			position: idx,
		}));

		// Atualiza local imediatamente
		setStages((prev) =>
			prev.map((s) => {
				const updated = updatedPositions.find((u) => u.id === s.id);
				return updated ?? s;
			}),
		);

		// Persiste reorder: envia TODAS as stages do pipeline na nova ordem global
		const allReordered = [...stages]
			.map((s) => updatedPositions.find((u) => u.id === s.id) ?? s)
			.sort((a, b) => {
				// Ordem por categoria (NOT_STARTED → ACTIVE → SCHEDULED → WON → LOST), depois position
				const catOrder = CATEGORY_CONFIG.map((c) => c.id);
				const ca = catOrder.indexOf(a.category);
				const cb = catOrder.indexOf(b.category);
				if (ca !== cb) return ca - cb;
				return a.position - b.position;
			})
			.map((s) => s.id);

		startTransition(async () => {
			try {
				await reorderStagesAction(
					{ pipelineId, orderedStageIds: allReordered },
					organizationSlug,
				);
			} catch (err) {
				toast.error("Não foi possível reordenar", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	function handleAddStage(category: EditableStage["category"]) {
		const inCat = stages.filter((s) => s.category === category);
		const nextPosition = inCat.length
			? Math.max(...inCat.map((s) => s.position)) + 1
			: 0;
		const defaultColor =
			category === "WON"
				? "#10b981"
				: category === "LOST"
					? "#ef4444"
					: category === "SCHEDULED"
						? "#06b6d4"
						: category === "NOT_STARTED"
							? "#94a3b8"
							: "#3b82f6";
		const defaultProb =
			category === "WON"
				? 100
				: category === "LOST"
					? 0
					: category === "NOT_STARTED"
						? 10
						: 50;
		startTransition(async () => {
			try {
				await createStageAction(
					{
						pipelineId,
						name: "Nova etapa",
						color: defaultColor,
						category,
						probability: defaultProb,
						position: nextPosition,
					},
					organizationSlug,
				);
			} catch (err) {
				toast.error("Não foi possível criar estágio", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	function handleConfirmDelete() {
		if (!deleteTarget) return;
		const leadCount = leadCountByStage[deleteTarget.id] ?? 0;
		if (!migrateToStageId) {
			toast.error("Selecione um estágio destino");
			return;
		}
		const target = deleteTarget;
		startTransition(async () => {
			try {
				await deleteStageAction(
					{
						stageId: target.id,
						migrateToStageId,
					},
					organizationSlug,
				);
				toast.success(
					leadCount > 0
						? `Estágio excluído. ${leadCount} ${leadCount === 1 ? "lead movido" : "leads movidos"}.`
						: "Estágio excluído",
				);
				setDeleteTarget(null);
				setMigrateToStageId("");
			} catch (err) {
				toast.error("Não foi possível excluir", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	const migrationTargets = deleteTarget
		? stages.filter((s) => s.id !== deleteTarget.id)
		: [];

	return (
		<>
			<Dialog
				open={open && !deleteTarget}
				onOpenChange={(next) => {
					if (!next) onOpenChange(false);
				}}
			>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							Editar estágios — {pipelineName}
						</DialogTitle>
						<DialogDescription>
							Organize seu funil em categorias funcionais. Arraste
							para reordenar dentro de cada categoria. Mudanças
							são salvas automaticamente.
						</DialogDescription>
					</DialogHeader>

					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<div className="space-y-5">
							{CATEGORY_CONFIG.map((cat) => {
								const catStages = grouped.get(cat.id) ?? [];
								return (
									<section key={cat.id} className="space-y-2">
										<div className="flex items-center justify-between border-b pb-1">
											<div>
												<h3
													className={cn(
														"text-sm font-semibold uppercase tracking-wide",
														cat.color,
													)}
												>
													{cat.label}
												</h3>
												<p className="text-[11px] text-foreground/50">
													{cat.description}
												</p>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() =>
													handleAddStage(cat.id)
												}
												disabled={isPending}
												className="h-7 gap-1"
											>
												<PlusIcon className="size-3" />
												Adicionar
											</Button>
										</div>

										{catStages.length === 0 ? (
											<p className="py-2 text-center text-[11px] text-foreground/40">
												Nenhuma etapa nesta categoria
											</p>
										) : (
											<SortableContext
												items={catStages.map(
													(s) => s.id,
												)}
												strategy={
													verticalListSortingStrategy
												}
											>
												<div className="space-y-1">
													{catStages.map((stage) => (
														<StageRow
															key={stage.id}
															stage={stage}
															leadCount={
																leadCountByStage[
																	stage.id
																] ?? 0
															}
															onRename={
																handleRename
															}
															onColorChange={
																handleColorChange
															}
															onProbabilityChange={
																handleProbabilityChange
															}
															onProbabilityCommit={
																handleProbabilityCommit
															}
															onMaxDaysChange={
																handleMaxDaysChange
															}
															onDelete={() =>
																setDeleteTarget(
																	stage,
																)
															}
															disabled={isPending}
															canDelete={
																stages.length >
																1
															}
														/>
													))}
												</div>
											</SortableContext>
										)}
									</section>
								);
							})}
						</div>
					</DndContext>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Fechar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete confirmation + migration dialog */}
			<Dialog
				open={!!deleteTarget}
				onOpenChange={(next) => {
					if (!next) {
						setDeleteTarget(null);
						setMigrateToStageId("");
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Excluir estágio</DialogTitle>
						<DialogDescription>
							O estágio <strong>{deleteTarget?.name}</strong> será
							removido permanentemente. Escolha para qual estágio
							os leads existentes serão migrados.
						</DialogDescription>
					</DialogHeader>

					{deleteTarget ? (
						<div className="space-y-3">
							<p className="text-foreground/70 text-xs">
								{(leadCountByStage[deleteTarget.id] ?? 0) > 0
									? `${leadCountByStage[deleteTarget.id]} ${leadCountByStage[deleteTarget.id] === 1 ? "lead será movido" : "leads serão movidos"} para o estágio destino.`
									: "Este estágio não tem leads — mesmo assim precisamos de um destino para manter consistência."}
							</p>
							<div className="space-y-1.5">
								<Label htmlFor="migrate-stage">
									Estágio destino
								</Label>
								<Select
									value={migrateToStageId}
									onValueChange={setMigrateToStageId}
								>
									<SelectTrigger id="migrate-stage">
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										{migrationTargets.map((s) => (
											<SelectItem key={s.id} value={s.id}>
												<span className="flex items-center gap-2">
													<span
														className="size-2 rounded-full"
														style={{
															backgroundColor:
																s.color,
														}}
													/>
													{s.name}
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					) : null}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setDeleteTarget(null);
								setMigrateToStageId("");
							}}
							disabled={isPending}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							variant="error"
							onClick={handleConfirmDelete}
							disabled={isPending || !migrateToStageId}
						>
							{isPending ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : null}
							Excluir estágio
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

type StageRowProps = {
	stage: EditableStage;
	leadCount: number;
	onRename: (stageId: string, name: string) => void;
	onColorChange: (stageId: string, color: string) => void;
	onProbabilityChange: (stageId: string, probability: number) => void;
	onProbabilityCommit: (stageId: string) => void;
	onMaxDaysChange: (stageId: string, value: string) => void;
	onDelete: () => void;
	disabled?: boolean;
	canDelete: boolean;
};

function StageRow({
	stage,
	leadCount,
	onRename,
	onColorChange,
	onProbabilityChange,
	onProbabilityCommit,
	onMaxDaysChange,
	onDelete,
	disabled,
	canDelete,
}: StageRowProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: stage.id });

	const [localName, setLocalName] = useState(stage.name);
	const [localMaxDays, setLocalMaxDays] = useState<string>(
		stage.maxDays == null ? "" : String(stage.maxDays),
	);

	useEffect(() => {
		setLocalName(stage.name);
	}, [stage.name]);

	useEffect(() => {
		setLocalMaxDays(stage.maxDays == null ? "" : String(stage.maxDays));
	}, [stage.maxDays]);

	const style = {
		transform: CSS.Translate.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"flex items-center gap-2 rounded-md border border-border/50 bg-card p-2",
				isDragging && "opacity-50",
			)}
		>
			<button
				type="button"
				aria-label="Arrastar"
				className="cursor-grab touch-none text-foreground/30 hover:text-foreground/70 active:cursor-grabbing"
				{...attributes}
				{...listeners}
			>
				<GripVerticalIcon className="size-4" />
			</button>

			<StageColorPicker
				value={stage.color}
				onChange={(color) => onColorChange(stage.id, color)}
				disabled={disabled}
			/>

			<Input
				value={localName}
				onChange={(e) => setLocalName(e.target.value)}
				onBlur={() => onRename(stage.id, localName)}
				onKeyDown={(e) => {
					if (e.key === "Enter") e.currentTarget.blur();
					if (e.key === "Escape") {
						setLocalName(stage.name);
						e.currentTarget.blur();
					}
				}}
				className="h-7 flex-1 text-sm"
				disabled={disabled}
			/>

			<div className="hidden w-28 shrink-0 flex-col gap-0.5 sm:flex">
				<div className="flex items-center justify-between">
					<span className="text-[10px] text-foreground/50">
						Prob.
					</span>
					<span className="font-mono text-[10px] tabular-nums">
						{stage.probability}%
					</span>
				</div>
				<Slider
					value={[stage.probability]}
					min={0}
					max={100}
					step={5}
					onValueChange={([v]) =>
						onProbabilityChange(stage.id, v ?? 0)
					}
					onValueCommit={() => onProbabilityCommit(stage.id)}
					disabled={disabled}
				/>
			</div>

			<div className="hidden w-20 shrink-0 flex-col gap-0.5 sm:flex">
				<span className="text-[10px] text-foreground/50">
					SLA (dias)
				</span>
				<Input
					value={localMaxDays}
					onChange={(e) => setLocalMaxDays(e.target.value)}
					onBlur={() => onMaxDaysChange(stage.id, localMaxDays)}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur();
					}}
					placeholder="—"
					className="h-6 text-center text-xs"
					inputMode="numeric"
					disabled={disabled}
				/>
			</div>

			{leadCount > 0 ? (
				<span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground/60 md:inline-block">
					{leadCount}
				</span>
			) : null}

			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-7 text-destructive hover:bg-destructive/10"
				onClick={onDelete}
				disabled={disabled || !canDelete}
				aria-label="Excluir estágio"
			>
				<Trash2Icon className="size-3.5" />
			</Button>
		</div>
	);
}
