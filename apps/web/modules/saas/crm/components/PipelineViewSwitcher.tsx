"use client";

import { SegmentedToggle } from "@saas/shared/components/SegmentedToggle";
import { KanbanSquareIcon, LineChartIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ViewMode } from "../lib/view-filters";

/**
 * Toggle entre Quadro (kanban) e Painel (dashboard) — Vinni 2026-04-26 noite.
 * Lista oculta por enquanto. Mesma data subjacente, views diferentes
 * (ClickUp-style).
 */
export function PipelineViewSwitcher({
	basePath,
	activeMode,
}: {
	basePath: string;
	activeMode: ViewMode;
}) {
	const router = useRouter();
	const searchParams = useSearchParams();

	function navigateTo(mode: ViewMode) {
		const p = new URLSearchParams(searchParams?.toString() ?? "");
		if (mode === "kanban") {
			p.delete("view");
		} else {
			p.set("view", mode);
		}
		const qs = p.toString();
		router.push(qs ? `${basePath}?${qs}` : basePath);
	}

	const current: "kanban" | "dashboard" =
		activeMode === "dashboard" ? "dashboard" : "kanban";

	return (
		<SegmentedToggle
			items={[
				{ key: "kanban", label: "Quadro", icon: KanbanSquareIcon },
				{ key: "dashboard", label: "Painel", icon: LineChartIcon },
			]}
			current={current}
			onChange={(k) => navigateTo(k as ViewMode)}
		/>
	);
}
