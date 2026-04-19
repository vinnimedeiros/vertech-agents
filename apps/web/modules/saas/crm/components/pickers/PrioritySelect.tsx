"use client";

import {
	PRIORITY_OPTIONS,
	type Priority,
} from "@saas/crm/components/pickers/lead-option-constants";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@ui/components/select";
import { cn } from "@ui/lib";
import { FlagIcon } from "lucide-react";

type Props = {
	value: Priority;
	onChange: (p: Priority) => void;
};

export function PrioritySelect({ value, onChange }: Props) {
	const current = PRIORITY_OPTIONS.find((p) => p.value === value);
	return (
		<Select value={value} onValueChange={(v) => onChange(v as Priority)}>
			<SelectTrigger className="h-7 w-auto gap-2 border-0 bg-transparent px-1.5 hover:bg-muted">
				<FlagIcon
					className={cn(
						"size-3.5",
						current?.colorClass,
						(value === "HIGH" || value === "URGENT") && "fill-current",
					)}
				/>
				<span className="text-sm">{current?.label ?? "—"}</span>
			</SelectTrigger>
			<SelectContent withPortal={false}>
				{PRIORITY_OPTIONS.map((p) => (
					<SelectItem key={p.value} value={p.value}>
						<span className="flex items-center gap-2">
							<FlagIcon className={cn("size-3.5", p.colorClass)} />
							{p.label}
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
