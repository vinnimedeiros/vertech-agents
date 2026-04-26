"use client";

import { cn } from "@ui/lib";
import {
	BotIcon,
	BrainIcon,
	CpuIcon,
	type LucideIcon,
	RocketIcon,
	UserCircleIcon,
	WrenchIcon,
} from "lucide-react";

type Section =
	| "persona"
	| "model"
	| "memory"
	| "modes"
	| "tools"
	| "deploy";

const SECTIONS: Array<{ key: Section; label: string; icon: LucideIcon }> = [
	{ key: "persona", label: "Persona", icon: UserCircleIcon },
	{ key: "model", label: "Modelo", icon: CpuIcon },
	{ key: "memory", label: "Memória", icon: BrainIcon },
	{ key: "modes", label: "Modos", icon: BotIcon },
	{ key: "tools", label: "Ferramentas", icon: WrenchIcon },
	{ key: "deploy", label: "Publicar", icon: RocketIcon },
];

type Props = {
	current: Section;
	onChange: (section: Section) => void;
};

export function AgentEditorNav({ current, onChange }: Props) {
	return (
		<nav className="flex flex-col gap-0.5">
			{SECTIONS.map((s) => {
				const isActive = s.key === current;
				const Icon = s.icon;
				return (
					<button
						key={s.key}
						type="button"
						onClick={() => onChange(s.key)}
						style={{ fontFamily: "var(--font-satoshi)" }}
						className={cn(
							"flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
							isActive
								? "bg-primary/10 font-medium text-foreground"
								: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
						)}
					>
						<Icon className={cn("size-3.5", isActive && "text-primary")} />
						{s.label}
					</button>
				);
			})}
		</nav>
	);
}

export type { Section };
export { SECTIONS };
