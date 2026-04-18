"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { cn } from "@ui/lib";
import {
	BuildingIcon,
	FlagIcon,
	MailIcon,
	PhoneIcon,
	UserIcon,
} from "lucide-react";
import { getOriginConfig } from "../lib/origins";
import type { KanbanLead } from "./PipelineKanban";

// ============================================================
// Temperature / Origin badge configs
// ============================================================

const TEMPERATURE_BADGE: Record<
	KanbanLead["temperature"],
	{ label: string; className: string }
> = {
	HOT: {
		label: "QUENTE",
		className: "bg-red-500 text-white",
	},
	WARM: {
		label: "MORNO",
		className: "bg-amber-500 text-white",
	},
	COLD: {
		label: "FRIO",
		className: "bg-sky-500 text-white",
	},
};

const PRIORITY_COLOR: Record<KanbanLead["priority"], string> = {
	URGENT: "text-red-500",
	HIGH: "text-orange-500",
	NORMAL: "text-foreground/40",
	LOW: "text-foreground/30",
};

// ============================================================
// Component
// ============================================================

type LeadCardProps = {
	lead: KanbanLead;
	/** Cor da etapa — usada pra tonalização sutil no hover */
	stageColor?: string;
	isOverlay?: boolean;
	onOpen?: () => void;
	daysInStage?: number;
	isStagnant?: boolean;
	responsibleName?: string | null;
	responsibleImage?: string | null;
};

export function LeadCard({
	lead,
	stageColor,
	isOverlay = false,
	onOpen,
	daysInStage,
	isStagnant,
	responsibleName,
	responsibleImage,
}: LeadCardProps) {
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

	const title = lead.title ?? lead.contact.name;
	const temp = TEMPERATURE_BADGE[lead.temperature];
	const originConfig = getOriginConfig(lead.origin);

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
				"group cursor-grab touch-none rounded-lg border border-border/60 bg-card p-3 shadow-sm transition-all active:cursor-grabbing",
				"hover:border-foreground/20 hover:shadow-md",
				isDragging && !isOverlay && "opacity-30",
				isOverlay && "rotate-3 scale-[1.02] shadow-2xl",
			)}
		>
			{/* Nome do lead */}
			<div className="flex items-start gap-2">
				<h4 className="flex-1 truncate font-semibold text-foreground text-sm">
					{title}
				</h4>
			</div>

			{/* Telefone */}
			{lead.contact.phone ? (
				<div className="mt-1 flex items-center gap-1.5 text-foreground/60 text-xs">
					<PhoneIcon className="size-3 shrink-0" />
					<span className="truncate">{lead.contact.phone}</span>
				</div>
			) : null}

			{/* Badges: temperatura + origem */}
			{(lead.temperature || originConfig) && (
				<div className="mt-2 flex flex-wrap items-center gap-1.5">
					<Badge className={temp.className}>{temp.label}</Badge>
					{originConfig && (
						<Badge className={cn(originConfig.bg, originConfig.text)}>
							{originConfig.label}
						</Badge>
					)}
				</div>
			)}

			{/* Estagnação */}
			{isStagnant && daysInStage != null && (
				<p className="mt-2 font-semibold text-destructive text-xs">
					{daysInStage}d parado
				</p>
			)}

			{/* Barra de ícones inferior */}
			<div className="mt-3 flex items-center gap-2">
				{lead.contact.phone && (
					<IconSlot>
						<PhoneIcon className="size-3.5 text-foreground/40" />
					</IconSlot>
				)}
				{responsibleName !== undefined && responsibleName !== null && (
					<IconSlot>
						<Avatar className="size-5">
							{responsibleImage && <AvatarImage src={responsibleImage} />}
							<AvatarFallback className="bg-violet-500 text-[9px] text-white">
								{responsibleName.slice(0, 1).toUpperCase()}
							</AvatarFallback>
						</Avatar>
					</IconSlot>
				)}
				{lead.contact.company && (
					<IconSlot>
						<BuildingIcon className="size-3.5 text-foreground/40" />
					</IconSlot>
				)}
				{lead.contact.email && (
					<IconSlot>
						<MailIcon className="size-3.5 text-foreground/40" />
					</IconSlot>
				)}
				{(lead.priority === "HIGH" || lead.priority === "URGENT") && (
					<IconSlot>
						<FlagIcon
							className={cn(
								"size-3.5",
								PRIORITY_COLOR[lead.priority],
								"fill-current",
							)}
						/>
					</IconSlot>
				)}
			</div>
		</div>
	);
}

// ============================================================
// Sub-components
// ============================================================

function Badge({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider",
				className,
			)}
		>
			{children}
		</span>
	);
}

function IconSlot({ children }: { children: React.ReactNode }) {
	return (
		<span className="flex size-5 shrink-0 items-center justify-center">
			{children}
		</span>
	);
}
