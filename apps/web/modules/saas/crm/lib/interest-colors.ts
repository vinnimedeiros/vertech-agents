/**
 * Paleta rotativa de cores pra badges de interesse criados pelo user.
 * Cada string ganha uma cor consistente via hash — mesmo texto sempre retorna mesma cor.
 */

const PALETTE = [
	{ bg: "bg-blue-600", text: "text-white" },
	{ bg: "bg-violet-600", text: "text-white" },
	{ bg: "bg-pink-600", text: "text-white" },
	{ bg: "bg-red-500", text: "text-white" },
	{ bg: "bg-orange-500", text: "text-white" },
	{ bg: "bg-amber-500", text: "text-white" },
	{ bg: "bg-emerald-500", text: "text-white" },
	{ bg: "bg-teal-500", text: "text-white" },
	{ bg: "bg-cyan-600", text: "text-white" },
	{ bg: "bg-indigo-600", text: "text-white" },
	{ bg: "bg-rose-500", text: "text-white" },
	{ bg: "bg-fuchsia-600", text: "text-white" },
];

export type InterestColor = (typeof PALETTE)[number];

export function getInterestColor(value: string): InterestColor {
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = value.charCodeAt(i) + ((hash << 5) - hash);
		hash |= 0;
	}
	return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** Normaliza pro display (primeira letra maiúscula, trim) */
export function normalizeInterest(raw: string): string {
	return raw.trim();
}
