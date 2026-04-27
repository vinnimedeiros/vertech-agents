"use client";

import { useEffect, useRef } from "react";

type Options = {
	value: string;
	maxRows?: number;
};

/**
 * Hook que expande textarea automaticamente conforme o conteudo cresce
 * (story 09.3 AC4-5).
 *
 * Estrategia: reset `height=auto` primeiro pra recalcular `scrollHeight` limpo,
 * depois define `height` com o menor valor entre scrollHeight e o maximo em px
 * (derivado de `maxRows` via line-height computado).
 *
 * CSS suporte: consumer aplica `transition-all duration-150` no textarea pra
 * animar a mudanca de altura suavemente (AC5).
 */
export function useAutoResizeTextarea({ value, maxRows = 8 }: Options) {
	const ref = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		// Reset pra medir scrollHeight "limpo"
		el.style.height = "auto";

		// Calcula altura maxima em px baseado no line-height computado
		const computedStyle = window.getComputedStyle(el);
		const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 20;
		const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
		const paddingBottom =
			Number.parseFloat(computedStyle.paddingBottom) || 0;
		const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;

		const nextHeight = Math.min(el.scrollHeight, maxHeight);
		el.style.height = `${nextHeight}px`;
		// Scroll interno quando passa do max — evita textarea "sumir" do viewport
		el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
	}, [value, maxRows]);

	return ref;
}
