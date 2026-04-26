/**
 * Tokens compartilhados do padrão floating do setor comercial.
 *
 * Wave 1 I.1 — foundation pra Wave 2+ (Chat floating, Listas floating,
 * Dashboard v2, Tabs comerciais, Cards de métricas).
 *
 * Refs:
 *   feedback_card_metallic_corners.md  — blur + linhas metálicas
 *   feedback_floating_tabs_pattern.md  — tab selected translúcido
 *   feedback_typography_premium.md     — Satoshi + Baskerville
 */

export type FloatingColor =
	| "lime"
	| "cyan"
	| "orange"
	| "violet"
	| "amber"
	| "rose"
	| "sky";

/**
 * Radial gradient suave aplicado no topo dos cards. Cor diferente por
 * categoria/tema. Anatomia "card SuperCash" — referência Vinni 2026-04-26.
 */
export const TINT_BY_COLOR: Record<FloatingColor, string> = {
	lime: "bg-[radial-gradient(ellipse_at_top,rgba(163,230,53,0.18),rgba(163,230,53,0.04)_60%,transparent)]",
	cyan: "bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.18),rgba(34,211,238,0.04)_60%,transparent)]",
	orange:
		"bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.18),rgba(251,146,60,0.04)_60%,transparent)]",
	violet:
		"bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.18),rgba(167,139,250,0.04)_60%,transparent)]",
	amber:
		"bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.18),rgba(251,191,36,0.04)_60%,transparent)]",
	rose: "bg-[radial-gradient(ellipse_at_top,rgba(244,114,182,0.18),rgba(244,114,182,0.04)_60%,transparent)]",
	sky: "bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.18),rgba(56,189,248,0.04)_60%,transparent)]",
};

/**
 * Cor de ícone por categoria — pareada com o blur tint.
 * Usar em ícone Lucide dentro do card de métrica/categoria.
 */
export const ICON_COLOR_BY_TINT: Record<FloatingColor, string> = {
	lime: "text-lime-300",
	cyan: "text-cyan-300",
	orange: "text-orange-300",
	violet: "text-violet-300",
	amber: "text-amber-300",
	rose: "text-rose-300",
	sky: "text-sky-300",
};

/**
 * Sombras canônicas. Default cobre 95% dos casos. Elevated pra cards
 * imponentes (KPI grandes, dialogs).
 */
export const SHADOW_TOKENS = {
	default:
		"shadow-[0_10px_40px_-20px_rgba(0,0,0,0.18),0_4px_12px_-6px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]",
	elevated:
		"shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25),0_8px_20px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)]",
} as const;

/**
 * Borda metálica usada nos 2 cantos opostos de MetricCard.
 * Sutil no light, levemente mais saturada no dark.
 */
export const METALLIC_BORDER = "border-zinc-300/35 dark:border-zinc-400/40";

/**
 * Classes base do FloatingPanel — exportadas pra debug ou
 * casos específicos onde se queira o estilo sem o componente.
 */
export const FLOATING_PANEL_BASE = [
	"overflow-hidden rounded-xl border border-border/40 bg-card/95 backdrop-blur",
	"dark:bg-card/85",
].join(" ");
