"use client";

import {
	TEMPERATURE_OPTIONS,
	type Temperature,
} from "@saas/crm/components/pickers/lead-option-constants";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@ui/components/select";
import { cn } from "@ui/lib";

type Props = {
	value: Temperature;
	onChange: (t: Temperature) => void;
};

export function TemperatureSelect({ value, onChange }: Props) {
	const current = TEMPERATURE_OPTIONS.find((t) => t.value === value);
	return (
		<Select value={value} onValueChange={(v) => onChange(v as Temperature)}>
			<SelectTrigger className="h-7 w-auto gap-2 border-0 bg-transparent px-1.5 hover:bg-muted">
				{current && (
					<span
						className={cn(
							"inline-flex items-center rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider",
							current.badgeClass,
						)}
					>
						{current.label}
					</span>
				)}
			</SelectTrigger>
			<SelectContent withPortal={false}>
				{TEMPERATURE_OPTIONS.map((t) => (
					<SelectItem key={t.value} value={t.value}>
						<span
							className={cn(
								"inline-flex items-center rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider",
								t.badgeClass,
							)}
						>
							{t.label}
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
