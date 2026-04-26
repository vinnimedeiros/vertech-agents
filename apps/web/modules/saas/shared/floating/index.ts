/**
 * Padrão floating canônico do setor comercial — Wave 1 Bloco I.1.
 *
 * Foundation visual reutilizável pra Wave 2+ (Chat floating, Listas
 * floating, Dashboard v2, Tabs comerciais, Cards de métricas).
 *
 * Refs de design:
 *   feedback_card_metallic_corners.md
 *   feedback_floating_tabs_pattern.md
 *   feedback_typography_premium.md
 */
export { FloatingCanvas } from "./FloatingCanvas";
export { FloatingHeader } from "./FloatingHeader";
export { FloatingPanel } from "./FloatingPanel";
export { FloatingTabs, type FloatingTabItem } from "./FloatingTabs";
export { MetricCard } from "./MetricCard";
export {
	FLOATING_PANEL_BASE,
	type FloatingColor,
	ICON_COLOR_BY_TINT,
	METALLIC_BORDER,
	SHADOW_TOKENS,
	TINT_BY_COLOR,
} from "./tokens";
