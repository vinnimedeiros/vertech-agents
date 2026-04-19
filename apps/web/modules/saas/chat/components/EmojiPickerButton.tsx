"use client";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { cn } from "@ui/lib";
import { SmileIcon } from "lucide-react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamic import — emoji-mart tem ~100KB. Carrega em background quando o
// composer monta (preload) pra primeira abertura ser instantânea.
const Picker = dynamic(() => import("@emoji-mart/react"), {
	ssr: false,
	loading: () => <div className="h-[435px] w-[350px]" />,
});

type Props = {
	onSelect: (emoji: string) => void;
	disabled?: boolean;
};

export function EmojiPickerButton({ onSelect, disabled }: Props) {
	const [open, setOpen] = useState(false);
	const [data, setData] = useState<unknown | null>(null);
	const { resolvedTheme } = useTheme();

	// Preload dos dados assim que o botão monta — o clique vira instantâneo.
	useEffect(() => {
		let cancelled = false;
		import("@emoji-mart/data")
			.then((mod) => {
				if (!cancelled) setData(mod.default ?? mod);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	function handleOpenChange(next: boolean) {
		setOpen(next);
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<button
					type="button"
					disabled={disabled}
					className={cn(
						"rounded-md p-2 text-foreground/60 hover:bg-foreground/5 hover:text-foreground disabled:opacity-50",
					)}
					title="Inserir emoji"
				>
					<SmileIcon className="size-4" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				side="top"
				align="start"
				className="w-auto border-none bg-transparent p-0 shadow-none"
				withPortal={false}
			>
				{data ? (
					<Picker
						data={data}
						onEmojiSelect={(e: { native: string }) => {
							onSelect(e.native);
							setOpen(false);
						}}
						theme={resolvedTheme === "dark" ? "dark" : "light"}
						locale="pt"
						previewPosition="none"
						skinTonePosition="search"
						maxFrequentRows={2}
					/>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
