"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { cn } from "@ui/lib";
import { ChevronDownIcon, CogIcon, PlusIcon, StarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ManagePipelinesModal } from "./ManagePipelinesModal";

export type PipelineOption = {
	id: string;
	name: string;
	isDefault: boolean;
	leadCount: number;
	totalValue: string;
};

type PipelineSelectorProps = {
	organizationSlug: string;
	organizationId: string;
	activePipelineId: string | null;
	pipelines: PipelineOption[];
	templates: import("../lib/server").StatusTemplateRow[];
};

function formatCurrency(value: string): string {
	const num = Number(value);
	if (Number.isNaN(num) || num === 0) return "";
	try {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
			maximumFractionDigits: 0,
		}).format(num);
	} catch {
		return `R$ ${num}`;
	}
}

export function PipelineSelector({
	organizationSlug,
	organizationId,
	activePipelineId,
	pipelines,
	templates,
}: PipelineSelectorProps) {
	const router = useRouter();
	const [manageOpen, setManageOpen] = useState(false);

	const active =
		pipelines.find((p) => p.id === activePipelineId) ?? pipelines[0];

	if (!active) {
		return (
			<Button
				type="button"
				size="sm"
				variant="primary"
				onClick={() => setManageOpen(true)}
			>
				<PlusIcon className="size-3.5" />
				Criar pipeline
			</Button>
		);
	}

	function handleSwitch(pipelineId: string) {
		router.push(
			`/app/${organizationSlug}/crm/pipeline?pipelineId=${pipelineId}`,
		);
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className={cn(
							"flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold outline-none transition-colors",
							"hover:bg-accent/50 focus-visible:bg-accent/50",
						)}
					>
						{active.name}
						{active.isDefault ? (
							<StarIcon className="size-3 fill-amber-500 text-amber-500" />
						) : null}
						<ChevronDownIcon className="size-3.5 opacity-50" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-72">
					<DropdownMenuLabel className="text-foreground/60 text-xs">
						Pipelines desta organização
					</DropdownMenuLabel>
					{pipelines.map((p) => {
						const isActive = p.id === active.id;
						return (
							<DropdownMenuItem
								key={p.id}
								onSelect={() => handleSwitch(p.id)}
								className="flex cursor-pointer items-center justify-between gap-2"
							>
								<div className="flex min-w-0 items-center gap-1.5">
									{p.isDefault ? (
										<StarIcon className="size-3 shrink-0 fill-amber-500 text-amber-500" />
									) : null}
									<span
										className={cn(
											"truncate",
											isActive && "font-semibold",
										)}
									>
										{p.name}
									</span>
								</div>
								<Badge
									className="shrink-0 text-[10px]"
									status="info"
								>
									{p.leadCount}
									{formatCurrency(p.totalValue) &&
										` · ${formatCurrency(p.totalValue)}`}
								</Badge>
							</DropdownMenuItem>
						);
					})}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={() => setManageOpen(true)}
						className="cursor-pointer"
					>
						<CogIcon className="mr-2 size-4" />
						Gerenciar pipelines
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{manageOpen ? (
				<ManagePipelinesModal
					organizationId={organizationId}
					organizationSlug={organizationSlug}
					pipelines={pipelines}
					templates={templates}
					onClose={() => setManageOpen(false)}
				/>
			) : null}
		</>
	);
}
