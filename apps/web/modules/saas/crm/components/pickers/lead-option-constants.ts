export type Temperature = "COLD" | "WARM" | "HOT";
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export const TEMPERATURE_OPTIONS: {
	value: Temperature;
	label: string;
	badgeClass: string;
}[] = [
	{ value: "HOT", label: "QUENTE", badgeClass: "bg-red-500 text-white" },
	{ value: "WARM", label: "MORNO", badgeClass: "bg-amber-500 text-white" },
	{ value: "COLD", label: "FRIO", badgeClass: "bg-sky-500 text-white" },
];

export const PRIORITY_OPTIONS: {
	value: Priority;
	label: string;
	colorClass: string;
}[] = [
	{ value: "URGENT", label: "Urgente", colorClass: "text-red-500" },
	{ value: "HIGH", label: "Alta", colorClass: "text-orange-500" },
	{ value: "NORMAL", label: "Normal", colorClass: "text-foreground/60" },
	{ value: "LOW", label: "Baixa", colorClass: "text-foreground/40" },
];
