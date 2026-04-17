"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog";
import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { cn } from "@ui/lib";
import {
	CheckIcon,
	LayoutGridIcon,
	MoreHorizontalIcon,
	PencilIcon,
	PlusIcon,
	RefreshCwIcon,
	StarIcon,
	Trash2Icon,
	UserIcon,
	UsersIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	deletePipelineViewAction,
	setDefaultPipelineViewAction,
	updatePipelineViewAction,
} from "../lib/actions-views";
import type { PipelineViewRow } from "../lib/server";
import type { ViewState } from "../lib/view-filters";
import { RenameViewDialog } from "./RenameViewDialog";
import { SaveViewDialog } from "./SaveViewDialog";

type SavedViewTabsProps = {
	pipelineId: string;
	organizationSlug: string;
	views: PipelineViewRow[];
	activeViewId: string | null;
	currentState: ViewState;
	basePath: string;
};

export function SavedViewTabs({
	pipelineId,
	organizationSlug,
	views,
	activeViewId,
	currentState,
	basePath,
}: SavedViewTabsProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [saveDialogOpen, setSaveDialogOpen] = useState(false);
	const [renamingView, setRenamingView] = useState<PipelineViewRow | null>(
		null,
	);

	const currentParams = useMemo(() => {
		return new URLSearchParams(searchParams?.toString() ?? "");
	}, [searchParams]);

	function navigateToView(viewId: string | null) {
		const p = new URLSearchParams(currentParams.toString());
		if (viewId) p.set("viewId", viewId);
		else p.delete("viewId");
		p.delete("view");
		const qs = p.toString();
		router.push(qs ? `${basePath}?${qs}` : basePath);
	}

	const showingAll = !activeViewId;

	return (
		<>
			<div className="flex items-center gap-1">
				<TabButton
					active={showingAll}
					onClick={() => navigateToView(null)}
					icon={<LayoutGridIcon className="size-3.5" />}
					label="Todos os leads"
				/>

				{views.map((view) => (
					<ViewTab
						key={view.id}
						view={view}
						active={activeViewId === view.id}
						organizationSlug={organizationSlug}
						currentState={currentState}
						onClick={() => navigateToView(view.id)}
						onRename={() => setRenamingView(view)}
						onDeleted={() => {
							if (activeViewId === view.id) navigateToView(null);
							else router.refresh();
						}}
					/>
				))}

				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="ml-1 h-8 gap-1.5 text-foreground/60 hover:text-foreground"
					onClick={() => setSaveDialogOpen(true)}
				>
					<PlusIcon className="size-3.5" />
					<span className="text-xs">Nova visão</span>
				</Button>
			</div>

			<SaveViewDialog
				open={saveDialogOpen}
				onOpenChange={setSaveDialogOpen}
				pipelineId={pipelineId}
				organizationSlug={organizationSlug}
				currentState={currentState}
				onCreated={(viewId) => navigateToView(viewId)}
			/>

			{renamingView && (
				<RenameViewDialog
					open={renamingView !== null}
					onOpenChange={(open) => {
						if (!open) setRenamingView(null);
					}}
					viewId={renamingView.id}
					currentName={renamingView.name}
					organizationSlug={organizationSlug}
				/>
			)}
		</>
	);
}

function TabButton({
	active,
	onClick,
	label,
	icon,
}: {
	active: boolean;
	onClick: () => void;
	label: string;
	icon?: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
				active
					? "bg-primary/10 text-primary"
					: "text-foreground/60 hover:bg-muted hover:text-foreground",
			)}
		>
			{icon}
			<span className="max-w-[180px] truncate">{label}</span>
		</button>
	);
}

type ViewTabProps = {
	view: PipelineViewRow;
	active: boolean;
	organizationSlug: string;
	currentState: ViewState;
	onClick: () => void;
	onRename: () => void;
	onDeleted: () => void;
};

function ViewTab({
	view,
	active,
	organizationSlug,
	currentState,
	onClick,
	onRename,
	onDeleted,
}: ViewTabProps) {
	const [busy, setBusy] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	async function handleUpdateWithCurrent() {
		setBusy(true);
		try {
			await updatePipelineViewAction(
				{
					viewId: view.id,
					filters: currentState.filters,
					viewMode: currentState.viewMode,
					sortBy: currentState.sortBy,
				},
				organizationSlug,
			);
			toast.success(`Visão "${view.name}" atualizada`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falhou");
		} finally {
			setBusy(false);
		}
	}

	async function handleSetDefault() {
		setBusy(true);
		try {
			await setDefaultPipelineViewAction(
				{ viewId: view.id },
				organizationSlug,
			);
			toast.success(`"${view.name}" é a visão padrão agora`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falhou");
		} finally {
			setBusy(false);
		}
	}

	async function handleToggleShare() {
		setBusy(true);
		try {
			await updatePipelineViewAction(
				{ viewId: view.id, isShared: !view.isShared },
				organizationSlug,
			);
			toast.success(
				view.isShared
					? "Visão deixou de ser compartilhada"
					: "Visão compartilhada com a equipe",
			);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falhou");
		} finally {
			setBusy(false);
		}
	}

	async function confirmDelete() {
		setBusy(true);
		try {
			await deletePipelineViewAction({ viewId: view.id }, organizationSlug);
			toast.success("Visão excluída");
			setDeleteDialogOpen(false);
			onDeleted();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falhou");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div
			className={cn(
				"group relative flex h-8 shrink-0 items-center rounded-md pr-1 transition-colors",
				active
					? "bg-primary/10 text-primary"
					: "text-foreground/60 hover:bg-muted hover:text-foreground",
			)}
		>
			<button
				type="button"
				onClick={onClick}
				className="flex h-full items-center gap-1.5 pl-3 text-sm"
			>
				{view.isDefault && (
					<StarIcon className="size-3 fill-amber-400 text-amber-400" />
				)}
				<span className="max-w-[180px] truncate">{view.name}</span>
				{view.isShared ? (
					<UsersIcon className="size-3 text-muted-foreground" />
				) : (
					<UserIcon className="size-3 text-muted-foreground/40" />
				)}
			</button>

			{view.isMine && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							disabled={busy}
							className={cn(
								"ml-0.5 flex h-6 w-6 items-center justify-center rounded opacity-0 transition-opacity hover:bg-background group-hover:opacity-100 data-[state=open]:opacity-100",
								active && "opacity-60",
							)}
							aria-label="Opções da visão"
						>
							<MoreHorizontalIcon className="size-3.5" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuItem onClick={onRename}>
							<PencilIcon className="mr-2 size-3.5" />
							Renomear
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={handleUpdateWithCurrent}
							disabled={busy}
						>
							<RefreshCwIcon className="mr-2 size-3.5" />
							Atualizar com o estado atual
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={handleSetDefault}
							disabled={busy || view.isDefault}
						>
							<StarIcon
								className={cn(
									"mr-2 size-3.5",
									view.isDefault && "fill-amber-400 text-amber-400",
								)}
							/>
							{view.isDefault ? "Já é a padrão" : "Definir como padrão"}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleToggleShare} disabled={busy}>
							{view.isShared ? (
								<>
									<UserIcon className="mr-2 size-3.5" />
									Tornar privada
								</>
							) : (
								<>
									<UsersIcon className="mr-2 size-3.5" />
									Compartilhar com a equipe
								</>
							)}
							{view.isShared && <CheckIcon className="ml-auto size-3.5" />}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={(e) => {
								e.preventDefault();
								setDeleteDialogOpen(true);
							}}
							disabled={busy}
							className="text-destructive focus:text-destructive"
						>
							<Trash2Icon className="mr-2 size-3.5" />
							Excluir visão
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir visão "{view.name}"?</AlertDialogTitle>
						<AlertDialogDescription>
							Essa ação é permanente. A aba será removida e os filtros
							guardados nela não poderão ser recuperados.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								confirmDelete();
							}}
							disabled={busy}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
