/**
 * Catalogo de origens de lead com cores.
 * Slug normalizado (lowercase, sem acentos) é o que vai persistido em `lead.origin`.
 * Labels em CAPS são display-only.
 */

export type OriginPreset = {
	slug: string;
	label: string;
	bg: string; // cor de fundo (tailwind class com bg-{color})
	text: string; // cor do texto
};

export const ORIGIN_PRESETS: OriginPreset[] = [
	{ slug: "email", label: "E-MAIL", bg: "bg-slate-500", text: "text-white" },
	{ slug: "evento", label: "EVENTO", bg: "bg-pink-500", text: "text-white" },
	{ slug: "facebook", label: "FACEBOOK", bg: "bg-blue-600", text: "text-white" },
	{ slug: "google", label: "GOOGLE", bg: "bg-red-500", text: "text-white" },
	{ slug: "indicacao", label: "INDICAÇÃO", bg: "bg-emerald-500", text: "text-white" },
	{ slug: "instagram", label: "INSTAGRAM", bg: "bg-pink-600", text: "text-white" },
	{ slug: "linkedin", label: "LINKEDIN", bg: "bg-sky-700", text: "text-white" },
	{ slug: "outro", label: "OUTRO", bg: "bg-neutral-700", text: "text-white" },
	{ slug: "site", label: "SITE", bg: "bg-violet-600", text: "text-white" },
	{ slug: "telefone", label: "TELEFONE", bg: "bg-teal-500", text: "text-white" },
	{ slug: "trafego_pago", label: "TRÁFEGO PAGO", bg: "bg-amber-500", text: "text-white" },
	{ slug: "whatsapp", label: "WHATSAPP", bg: "bg-green-600", text: "text-white" },
];

const PRESET_BY_SLUG = new Map(ORIGIN_PRESETS.map((p) => [p.slug, p]));

/** Normaliza qualquer string pra slug (lowercase, sem acentos, sem espaços) */
export function normalizeOriginSlug(raw: string): string {
	return raw
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^a-z0-9_]/g, "");
}

/**
 * Retorna config visual pra um slug de origem.
 * Se for preset conhecido → cor definida. Se for custom → cinza fallback.
 */
export function getOriginConfig(slug: string | null | undefined): OriginPreset | null {
	if (!slug) return null;
	const preset = PRESET_BY_SLUG.get(slug);
	if (preset) return preset;
	// Custom: fallback neutro
	return {
		slug,
		label: slug.toUpperCase().replace(/_/g, " "),
		bg: "bg-zinc-600",
		text: "text-white",
	};
}
