"use client";

import { Input } from "@ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { cn } from "@ui/lib";
import { useState } from "react";

const PALETTE = [
	"#64748b", // slate
	"#94a3b8", // slate-400
	"#f43f5e", // rose
	"#ef4444", // red
	"#f97316", // orange
	"#fb923c", // orange-400
	"#f59e0b", // amber
	"#eab308", // yellow
	"#84cc16", // lime
	"#22c55e", // green
	"#10b981", // emerald
	"#06b6d4", // cyan
	"#3b82f6", // blue
	"#6366f1", // indigo
	"#8b5cf6", // violet
	"#d946ef", // fuchsia
	"#ec4899", // pink
];

type StageColorPickerProps = {
	value: string;
	onChange: (color: string) => void;
	disabled?: boolean;
};

function isValidHex(hex: string): boolean {
	return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
}

export function StageColorPicker({
	value,
	onChange,
	disabled,
}: StageColorPickerProps) {
	const [hexInput, setHexInput] = useState(value);
	const [open, setOpen] = useState(false);

	function handleHexChange(v: string) {
		setHexInput(v);
		if (isValidHex(v)) {
			onChange(v);
		}
	}

	function handleSwatchClick(color: string) {
		setHexInput(color);
		onChange(color);
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					disabled={disabled}
					aria-label="Escolher cor"
					className={cn(
						"size-5 shrink-0 rounded-full border border-border/60 shadow-sm transition-transform",
						"hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						disabled && "cursor-not-allowed opacity-50",
					)}
					style={{ backgroundColor: value }}
				/>
			</PopoverTrigger>
			<PopoverContent
				className="w-64 p-3"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="space-y-3">
					<div>
						<p className="mb-2 text-foreground/70 text-xs font-medium">
							Paleta sugerida
						</p>
						<div className="grid grid-cols-8 gap-1.5">
							{PALETTE.map((color) => {
								const active =
									color.toLowerCase() === value.toLowerCase();
								return (
									<button
										key={color}
										type="button"
										onClick={() => handleSwatchClick(color)}
										aria-label={`Cor ${color}`}
										className={cn(
											"size-6 rounded-md border border-border/60 shadow-sm transition-transform hover:scale-110",
											active &&
												"ring-2 ring-ring ring-offset-1",
										)}
										style={{ backgroundColor: color }}
									/>
								);
							})}
						</div>
					</div>
					<div>
						<p className="mb-1 text-foreground/70 text-xs font-medium">
							Cor personalizada (hex)
						</p>
						<div className="flex items-center gap-2">
							<span
								className="size-6 shrink-0 rounded-md border border-border/60"
								style={{
									backgroundColor: isValidHex(hexInput)
										? hexInput
										: value,
								}}
							/>
							<Input
								value={hexInput}
								onChange={(e) =>
									handleHexChange(e.target.value)
								}
								placeholder="#3b82f6"
								className="h-7 font-mono text-xs"
								maxLength={7}
							/>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
