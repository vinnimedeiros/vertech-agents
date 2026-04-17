"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
	MoveRightIcon,
	Trash2Icon,
	UserMinus2Icon,
	UserPlus2Icon,
	XIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	bulkAssignLeadsAction,
	bulkDeleteLeadsAction,
	bulkMoveLeadsAction,
} from "../lib/actions-bulk";
import type { OrgMemberOption } from "../lib/server";

export type BulkStageOption = {
	id: string;
	name: string;
	color: string;
};

type BulkActionsBarProps = {
	selectedIds: string[];
	onClear: () => void;
	stages: BulkStageOption[];
	members: OrgMemberOption[];
	organizationSlug: string;
};

export function BulkActionsBar({
	selectedIds,
	onClear,
	stages,
	members,
	organizationSlug,
}: BulkActionsBarProps) {
	const [busy, setBusy] = useState(false);
	const count = selectedIds.length;

	if (count === 0) return null;

	async function handleMove(stageId: string) {
		setBusy(true);
		try {
			await bulkMoveLeadsAction(
				{ leadIds: selectedIds, toStageId: stageId },
				organizationSlug,
			);
			toast.success(`${count} lead(s) movidos`);
			onClear();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falhou");
		} finally {
			setBusy(false);
		}
	}

	async function handleAssign(userId: string | null) {
		setBusy(true);
		try {
			await bulkAssignLeadsAction(
				{ leadIds: selectedIds, assigneeId: userId },
				organizationSlug,
			);
			toast.success(
				userId ? `${count} lead(s) atribuídos` : `${count} lead(s) sem responsável`,
			);
			onClear();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falhou");
		} finally {
			setBusy(false);
		}
	}

	async function handleDelete() {
		const confirmed = window.confirm(
			`Excluir ${count} lead(s) selecionado(s)? Essa ação é permanente.`,
		);
		if (!confirmed) return;
		setBusy(true);
		try {
			await bulkDeleteLeadsAction(
				{ leadIds: selectedIds },
				organizationSlug,
			);
			toast.success(`${count} lead(s) excluídos`);
			onClear();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falhou");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="sticky bottom-4 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border bg-background px-4 py-2 shadow-lg">
			<div className="flex items-center gap-1.5 text-sm">
				<span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
					{count}
				</span>
				<span className="font-medium">selecionado(s)</span>
			</div>

			<div className="mx-1 h-4 w-px bg-border" />

			{/* Mover pra estágio */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button type="button" variant="ghost" size="sm" disabled={busy}>
						<MoveRightIcon className="mr-1.5 size-3.5" />
						Mover
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="center">
					<DropdownMenuLabel>Mover para</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{stages.map((s) => (
						<DropdownMenuItem key={s.id} onClick={() => handleMove(s.id)}>
							<span
								className="mr-2 size-2.5 rounded-full"
								style={{ backgroundColor: s.color }}
							/>
							{s.name}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Atribuir */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button type="button" variant="ghost" size="sm" disabled={busy}>
						<UserPlus2Icon className="mr-1.5 size-3.5" />
						Atribuir
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="center" className="w-56">
					<DropdownMenuLabel>Atribuir a</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{members.map((m) => (
						<DropdownMenuItem
							key={m.userId}
							onClick={() => handleAssign(m.userId)}
						>
							<Avatar className="mr-2 size-5">
								{m.image && <AvatarImage src={m.image} />}
								<AvatarFallback className="text-[10px]">
									{(m.name ?? m.email ?? "?").slice(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<span className="truncate">
								{m.name ?? m.email ?? "Usuário"}
							</span>
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => handleAssign(null)}>
						<UserMinus2Icon className="mr-2 size-3.5" />
						Remover responsável
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Excluir */}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={handleDelete}
				disabled={busy}
				className="text-destructive hover:text-destructive"
			>
				<Trash2Icon className="mr-1.5 size-3.5" />
				Excluir
			</Button>

			<div className="mx-1 h-4 w-px bg-border" />

			<button
				type="button"
				onClick={onClear}
				disabled={busy}
				className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
				aria-label="Limpar seleção"
			>
				<XIcon className="size-3.5" />
			</button>
		</div>
	);
}
