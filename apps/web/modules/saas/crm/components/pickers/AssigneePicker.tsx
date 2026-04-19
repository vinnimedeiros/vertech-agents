"use client";

import type { OrgMemberOption } from "@saas/crm/lib/server";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { cn } from "@ui/lib";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

type Props = {
	members: OrgMemberOption[];
	value: string | null;
	onChange: (userId: string | null) => void;
};

export function AssigneePicker({ members, value, onChange }: Props) {
	const current = value ? members.find((m) => m.userId === value) : null;
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 text-sm hover:bg-muted"
				>
					{current ? (
						<>
							<Avatar className="size-5">
								{current.image && <AvatarImage src={current.image} />}
								<AvatarFallback className="bg-violet-500 text-[10px] text-white">
									{(current.name ?? current.email ?? "?")
										.slice(0, 1)
										.toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<span>{current.name ?? current.email}</span>
						</>
					) : (
						<span className="text-foreground/40">Atribuir…</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-56 p-1" withPortal={false}>
				<div className="max-h-60 space-y-0.5 overflow-y-auto">
					{members.map((m) => (
						<button
							key={m.userId}
							type="button"
							onMouseDown={(e) => {
								e.preventDefault();
								onChange(m.userId);
								setOpen(false);
							}}
							className={cn(
								"flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
								value === m.userId && "bg-primary/10",
							)}
						>
							<Avatar className="size-5">
								{m.image && <AvatarImage src={m.image} />}
								<AvatarFallback className="bg-violet-500 text-[10px] text-white">
									{(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<span className="flex-1 truncate">
								{m.name ?? m.email ?? "Usuário"}
							</span>
							{value === m.userId && <CheckIcon className="size-3.5" />}
						</button>
					))}
					{value && (
						<button
							type="button"
							onMouseDown={(e) => {
								e.preventDefault();
								onChange(null);
								setOpen(false);
							}}
							className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
						>
							Remover responsável
						</button>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
