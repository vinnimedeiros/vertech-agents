"use client";

import { cn } from "@ui/lib";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@ui/components/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { Check, ChevronRight, Eye, EyeOff, MoreHorizontal } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
	deleteCalendarAction,
	updateCalendarAction,
} from "../lib/actions";
import type { CalendarRow } from "../types";

type Props = {
	calendars: CalendarRow[];
	organizationSlug: string;
	onEdit?: (calendarId: string) => void;
};

const GROUPS: Array<{
	id: "personal" | "shared" | "work";
	label: string;
	defaultOpen: boolean;
}> = [
	{ id: "personal", label: "Meus Calendários", defaultOpen: true },
	{ id: "shared", label: "Favoritos", defaultOpen: false },
	{ id: "work", label: "Outros", defaultOpen: false },
];

export function CalendarsList({ calendars, organizationSlug, onEdit }: Props) {
	const [isPending, startTransition] = useTransition();

	const handleToggle = (cal: CalendarRow) => {
		startTransition(async () => {
			try {
				await updateCalendarAction(
					{ calendarId: cal.id, visible: !cal.visible },
					organizationSlug,
				);
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao alterar",
				);
			}
		});
	};

	const handleDelete = (cal: CalendarRow) => {
		startTransition(async () => {
			try {
				await deleteCalendarAction(
					{ calendarId: cal.id },
					organizationSlug,
				);
				toast.success("Calendário excluído");
			} catch (err) {
				const msg =
					err instanceof Error ? err.message : "Falha ao excluir";
				toast.error(
					msg === "CANNOT_DELETE_DEFAULT_CALENDAR"
						? "Calendário padrão não pode ser excluído."
						: msg,
				);
			}
		});
	};

	return (
		<div className="space-y-3">
			{GROUPS.map((group) => {
				const items = calendars.filter((c) => c.type === group.id);
				if (items.length === 0) return null;
				return (
					<Collapsible key={group.id} defaultOpen={group.defaultOpen}>
						<CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground group/collapsible">
							<span>{group.label}</span>
							<ChevronRight className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
						</CollapsibleTrigger>
						<CollapsibleContent>
							<div className="mt-1 space-y-0.5">
								{items.map((cal) => (
									<div
										key={cal.id}
										className="group/calendar-item rounded-md"
									>
										<div className="flex items-center gap-3 rounded-md p-2 hover:bg-accent/50">
											<button
												type="button"
												onClick={() => handleToggle(cal)}
												disabled={isPending}
												className={cn(
													"flex aspect-square size-4 shrink-0 items-center justify-center rounded-sm border transition-all cursor-pointer",
													cal.visible
														? cn(
																"border-transparent text-white",
																cal.color,
															)
														: "border-border bg-transparent",
												)}
												aria-label={
													cal.visible
														? "Ocultar calendário"
														: "Mostrar calendário"
												}
											>
												{cal.visible && <Check className="size-3" />}
											</button>
											<button
												type="button"
												onClick={() => handleToggle(cal)}
												className={cn(
													"flex-1 truncate text-left text-sm cursor-pointer",
													!cal.visible && "text-muted-foreground",
												)}
											>
												{cal.name}
											</button>
											<div className="opacity-0 transition-opacity group-hover/calendar-item:opacity-100">
												{cal.visible ? (
													<Eye className="size-3 text-muted-foreground" />
												) : (
													<EyeOff className="size-3 text-muted-foreground" />
												)}
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<button
														type="button"
														className="flex size-5 cursor-pointer items-center justify-center rounded-sm opacity-0 hover:bg-accent group-hover/calendar-item:opacity-100"
														aria-label="Opções do calendário"
													>
														<MoreHorizontal className="size-3" />
													</button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" side="right">
													<DropdownMenuItem
														onClick={() => onEdit?.(cal.id)}
														className="cursor-pointer"
													>
														Editar calendário
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleToggle(cal)}
														className="cursor-pointer"
													>
														{cal.visible ? "Ocultar" : "Mostrar"}
													</DropdownMenuItem>
													{!cal.isDefault && (
														<>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																onClick={() => handleDelete(cal)}
																className="cursor-pointer text-destructive"
															>
																Excluir calendário
															</DropdownMenuItem>
														</>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								))}
							</div>
						</CollapsibleContent>
					</Collapsible>
				);
			})}
		</div>
	);
}
