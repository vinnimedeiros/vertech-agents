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
		<nav className="flex flex-col gap-0.5 border-border border-r bg-card/30 p-3 lg:w-56">
			{SECTIONS.map((s) => {
				const isActive = s.key === current;
				const Icon = s.icon;
				return (
					<button
						key={s.key}
						type="button"
						onClick={() => onChange(s.key)}
						className={cn(
							"flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
							isActive
								? "bg-primary/10 font-medium text-foreground"
								: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
						)}
					>
						<Icon className={cn("size-4", isActive && "text-primary")} />
						{s.label}
					</button>
				);
			})}
		</nav>
	);
}

export type { Section };
export { SECTIONS };
