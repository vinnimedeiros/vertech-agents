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
import { cn } from "@ui/lib";
import {
	BookmarkPlusIcon,
	CheckIcon,
	Loader2Icon,
	PencilIcon,
	PlusIcon,
	StarIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
	createPipelineAction,
	deletePipelineAction,
	setDefaultPipelineAction,
	updatePipelineAction,
} from "../lib/actions-pipeline";
import type { StatusTemplateRow } from "../lib/server";
import type { PipelineOption } from "./PipelineSelector";
import { SaveAsTemplateDialog } from "./templates/SaveAsTemplateDialog";
import { TemplateLibraryDialog } from "./templates/TemplateLibraryDialog";

type ManagePipelinesModalProps = {
	organizationId: string;
	organizationSlug: string;
	pipelines: PipelineOption[];
	templates: StatusTemplateRow[];
	onClose: () => void;
};

export function ManagePipelinesModal({
	organizationId,
	organizationSlug,
	pipelines,
	templates,
	onClose,
}: ManagePipelinesModalProps) {
	const [isPending, startTransition] = useTransition();
	const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
	const [saveAsTemplateTarget, setSaveAsTemplateTarget] =
		useState<PipelineOption | null>(null);
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [deleteTarget, setDeleteTarget] = useState<PipelineOption | null>(
		null,
	);
	const [migrateToId, setMigrateToId] = useState<string>("");

	const handleCreate = () => {
		if (!newName.trim()) return;
		const name = newName.trim();
		startTransition(async () => {
			try {
				await createPipelineAction(
					{ organizationId, name },
					organizationSlug,
				);
				toast.success("Pipeline criado");
				setCreating(false);
				setNewName("");
			} catch (err) {
				toast.error("Não foi possível criar", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	};

	const handleRename = (pipelineId: string) => {
		const name = editName.trim();
		if (!name) {
			setEditingId(null);
			return;
		}
		startTransition(async () => {
			try {
				await updatePipelineAction(
					{ pipelineId, name },
					organizationSlug,
				);
				toast.success("Pipeline renomeado");
				setEditingId(null);
			} catch (err) {
				toast.error("Não foi possível renomear", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	};

	const handleSetDefault = (pipelineId: string) => {
		startTransition(async () => {
			try {
				await setDefaultPipelineAction(pipelineId, organizationSlug);
				toast.success("Pipeline principal atualizado");
			} catch (err) {
				toast.error("Não foi possível definir como principal", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	};

	const handleConfirmDelete = () => {
		if (!deleteTarget) return;
		const leadCount = deleteTarget.leadCount;
		if (leadCount > 0 && !migrateToId) {
			toast.error("Selecione um pipeline destino para migrar os leads");
			return;
		}
		startTransition(async () => {
			try {
				await deletePipelineAction(
					{
						pipelineId: deleteTarget.id,
						moveLeadsToPipelineId:
							leadCount > 0 ? migrateToId : undefined,
					},
					organizationSlug,
				);
				toast.success("Pipeline excluído");
				setDeleteTarget(null);
				setMigrateToId("");
			} catch (err) {
				toast.error("Não foi possível excluir", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	};

	const migrationTargets = pipelines.filter((p) => p.id !== deleteTarget?.id);

	return (
		<>
			<Dialog
				open={!deleteTarget}
				onOpenChange={(open) => {
					if (!open) onClose();
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Gerenciar pipelines</DialogTitle>
						<DialogDescription>
							Crie, renomeie e organize seus funis comerciais.
							Cada pipeline tem suas próprias etapas e leads.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-1">
						{pipelines.map((p) => {
							const isEditing = editingId === p.id;
							return (
								<div
									key={p.id}
									className={cn(
										"flex items-center gap-2 rounded-md px-2 py-2",
										"hover:bg-accent/40",
									)}
								>
									<button
										type="button"
										onClick={() => handleSetDefault(p.id)}
										disabled={p.isDefault || isPending}
										aria-label={
											p.isDefault
												? "Pipeline principal"
												: "Definir como principal"
										}
										className="shrink-0 cursor-pointer text-foreground/40 hover:text-amber-500 disabled:cursor-default"
									>
										<StarIcon
											className={cn(
												"size-4",
												p.isDefault &&
													"fill-amber-500 text-amber-500",
											)}
										/>
									</button>

									{isEditing ? (
										<div className="flex flex-1 items-center gap-1">
											<Input
												value={editName}
												onChange={(e) =>
													setEditName(e.target.value)
												}
												onKeyDown={(e) => {
													if (e.key === "Enter")
														handleRename(p.id);
													if (e.key === "Escape")
														setEditingId(null);
												}}
												className="h-7 flex-1 text-sm"
												autoFocus
											/>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												className="size-7"
												onClick={() =>
													handleRename(p.id)
												}
											>
												<CheckIcon className="size-3.5 text-emerald-500" />
											</Button>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												className="size-7"
												onClick={() =>
													setEditingId(null)
												}
											>
												<XIcon className="size-3.5" />
											</Button>
										</div>
									) : (
										<>
											<span className="flex-1 truncate text-sm font-medium">
												{p.name}
											</span>
											<span className="shrink-0 text-foreground/50 text-xs">
												{p.leadCount}{" "}
												{p.leadCount === 1
													? "lead"
													: "leads"}
											</span>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												className="size-7"
												onClick={() => {
													setEditingId(p.id);
													setEditName(p.name);
												}}
												title="Renomear"
											>
												<PencilIcon className="size-3.5" />
											</Button>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												className="size-7"
												onClick={() => setSaveAsTemplateTarget(p)}
												title="Salvar como template"
											>
												<BookmarkPlusIcon className="size-3.5" />
											</Button>
											{!p.isDefault ? (
												<Button
													type="button"
													size="icon"
													variant="ghost"
													className="size-7 text-destructive hover:bg-destructive/10"
													onClick={() =>
														setDeleteTarget(p)
													}
												>
													<Trash2Icon className="size-3.5" />
												</Button>
											) : null}
										</>
									)}
								</div>
							);
						})}

						{creating ? (
							<div className="flex items-center gap-2 rounded-md px-2 py-2">
								<PlusIcon className="size-4 shrink-0 text-foreground/40" />
								<Input
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") handleCreate();
										if (e.key === "Escape") {
											setCreating(false);
											setNewName("");
										}
									}}
									placeholder="Nome do pipeline (em branco)"
									className="h-7 flex-1 text-sm"
									autoFocus
								/>
								<Button
									type="button"
									size="icon"
									variant="ghost"
									className="size-7"
									onClick={handleCreate}
									disabled={!newName.trim() || isPending}
								>
									{isPending ? (
										<Loader2Icon className="size-3.5 animate-spin" />
									) : (
										<CheckIcon className="size-3.5 text-emerald-500" />
									)}
								</Button>
								<Button
									type="button"
									size="icon"
									variant="ghost"
									className="size-7"
									onClick={() => {
										setCreating(false);
										setNewName("");
									}}
								>
									<XIcon className="size-3.5" />
								</Button>
							</div>
						) : (
							<div className="flex flex-col gap-1">
								<button
									type="button"
									onClick={() => setTemplateLibraryOpen(true)}
									className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-foreground/60 text-sm hover:bg-accent/40 hover:text-foreground"
								>
									<PlusIcon className="size-4" />
									Novo pipeline com template
								</button>
								<button
									type="button"
									onClick={() => setCreating(true)}
									className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-foreground/50 text-xs hover:bg-accent/40 hover:text-foreground"
								>
									<span className="ml-6">ou começar em branco</span>
								</button>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isPending}
						>
							Fechar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Template library */}
			<TemplateLibraryDialog
				open={templateLibraryOpen}
				onOpenChange={setTemplateLibraryOpen}
				organizationId={organizationId}
				organizationSlug={organizationSlug}
				templates={templates}
				onPipelineCreated={() => {
					onClose();
				}}
			/>

			{/* Salvar como template */}
			{saveAsTemplateTarget && (
				<SaveAsTemplateDialog
					open={saveAsTemplateTarget !== null}
					onOpenChange={(o) => {
						if (!o) setSaveAsTemplateTarget(null);
					}}
					pipelineId={saveAsTemplateTarget.id}
					pipelineName={saveAsTemplateTarget.name}
					organizationSlug={organizationSlug}
				/>
			)}

			{/* Delete confirmation dialog */}
			<Dialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
						setMigrateToId("");
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Excluir pipeline</DialogTitle>
						<DialogDescription>
							Esta ação não pode ser desfeita. O pipeline{" "}
							<strong>{deleteTarget?.name}</strong> será
							permanentemente removido.
						</DialogDescription>
					</DialogHeader>

					{deleteTarget && deleteTarget.leadCount > 0 ? (
						<div className="space-y-3">
							<p className="text-foreground/80 text-sm">
								Existem{" "}
								<strong>{deleteTarget.leadCount}</strong>{" "}
								{deleteTarget.leadCount === 1
									? "lead"
									: "leads"}{" "}
								neste pipeline. Escolha para qual pipeline eles
								serão migrados:
							</p>
							<div className="space-y-2">
								<Label htmlFor="migrate-to">
									Pipeline destino
								</Label>
								<Select
									value={migrateToId}
									onValueChange={setMigrateToId}
								>
									<SelectTrigger id="migrate-to">
										<SelectValue placeholder="Selecione um pipeline" />
									</SelectTrigger>
									<SelectContent>
										{migrationTargets.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name}
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
								setMigrateToId("");
							}}
							disabled={isPending}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							variant="error"
							onClick={handleConfirmDelete}
							disabled={isPending}
						>
							{isPending ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : null}
							Excluir pipeline
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
