"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@ui/lib";
import {
	BuildingIcon,
	FlameIcon,
	MailIcon,
	PhoneIcon,
	SnowflakeIcon,
	ThermometerIcon,
} from "lucide-react";
import type { KanbanLead } from "./PipelineKanban";

const TEMPERATURE_CONFIG = {
	COLD: {
		icon: SnowflakeIcon,
		color: "text-blue-500",
		label: "Frio",
	},
	WARM: {
		icon: ThermometerIcon,
		color: "text-amber-500",
		label: "Morno",
	},
	HOT: {
		icon: FlameIcon,
		color: "text-red-500",
		label: "Quente",
	},
} as const;

const PRIORITY_COLORS: Record<string, string> = {
	LOW: "border-l-slate-300",
	NORMAL: "border-l-slate-400",
	HIGH: "border-l-amber-500",
	URGENT: "border-l-red-500",
};

function formatCurrency(value: string | null, currency: string): string | null {
	if (!value) return null;
	const num = Number(value);
	if (Number.isNaN(num)) return null;
	try {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency,
			maximumFractionDigits: 0,
		}).format(num);
	} catch {
		return `${currency} ${num}`;
	}
}

type LeadCardProps = {
	lead: KanbanLead;
	isOverlay?: boolean;
	onOpen?: () => void;
};

export function LeadCard({ lead, isOverlay = false, onOpen }: LeadCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: lead.id,
		data: { type: "lead", lead },
	});

	const style = {
		transform: CSS.Translate.toString(transform),
		transition,
	};

	const Temp = TEMPERATURE_CONFIG[lead.temperature];
	const value = formatCurrency(lead.value, lead.currency);
	const title = lead.title ?? lead.contact.name;

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			onClick={() => {
				if (!isDragging && !isOverlay) onOpen?.();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onOpen?.();
				}
			}}
			role={onOpen ? "button" : undefined}
			tabIndex={onOpen ? 0 : undefined}
			className={cn(
				"group cursor-grab touch-none rounded-md border border-l-4 bg-card p-3 shadow-sm transition-all active:cursor-grabbing",
				PRIORITY_COLORS[lead.priority] ?? PRIORITY_COLORS.NORMAL,
				isDragging && !isOverlay && "opacity-30",
				isOverlay && "rotate-2 shadow-xl ring-2 ring-primary",
				"hover:border-foreground/20 hover:shadow-md",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<h4 className="truncate font-medium text-foreground text-sm">
					{title}
				</h4>
				<Temp.icon
					className={cn("size-4 shrink-0", Temp.color)}
					aria-label={Temp.label}
				/>
			</div>

			{lead.title && lead.contact.name !== title ? (
				<p className="mt-1 truncate text-foreground/60 text-xs">
					{lead.contact.name}
				</p>
			) : null}

			{value ? (
				<p className="mt-2 font-semibold text-foreground text-sm">
					{value}
				</p>
			) : null}

			<div className="mt-2 flex items-center gap-3 text-foreground/40 text-xs">
				{lead.contact.phone ? (
					<span className="flex items-center gap-1">
						<PhoneIcon className="size-3" />
					</span>
				) : null}
				{lead.contact.email ? (
					<span className="flex items-center gap-1">
						<MailIcon className="size-3" />
					</span>
				) : null}
				{lead.contact.company ? (
					<span className="flex items-center gap-1 truncate">
						<BuildingIcon className="size-3 shrink-0" />
						<span className="truncate">{lead.contact.company}</span>
					</span>
				) : null}
			</div>
		</div>
	);
}
