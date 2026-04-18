"use client";

import { useEffect, useRef } from "react";

/**
 * Hook que adiciona "pan-to-scroll" horizontal num container.
 * Clique + arraste no fundo (espaço vazio) scrolla o conteúdo lateralmente — estilo Trello.
 *
 * Ignora clicks em elementos interativos (botões, inputs, links, cards dnd, etc)
 * pra não conflitar com drag-and-drop de cards ou cliques normais.
 */
export function usePanToScroll<T extends HTMLElement>(enabled = true) {
	const ref = useRef<T | null>(null);
	const state = useRef<{
		startX: number;
		scrollLeft: number;
		moved: boolean;
	} | null>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el || !enabled) return;

		function isInteractive(target: EventTarget | null): boolean {
			if (!(target instanceof Element)) return false;
			return !!target.closest(
				[
					"button",
					"a[href]",
					"input",
					"textarea",
					"select",
					"summary",
					"label",
					"[role='button']",
					"[role='tab']",
					"[role='menuitem']",
					"[role='option']",
					"[role='checkbox']",
					"[role='switch']",
					"[role='combobox']",
					"[draggable='true']",
					"[data-pan-ignore='true']",
				].join(","),
			);
		}

		function onMouseDown(e: MouseEvent) {
			if (e.button !== 0) return;
			if (isInteractive(e.target)) return;
			if (!el) return;
			// Impede selecao de texto / drag nativo que interfere no pan
			e.preventDefault();
			state.current = {
				startX: e.pageX,
				scrollLeft: el.scrollLeft,
				moved: false,
			};
			el.style.cursor = "grabbing";
			el.style.userSelect = "none";
		}

		function onMouseMove(e: MouseEvent) {
			if (!state.current || !el) return;
			const dx = e.pageX - state.current.startX;
			if (Math.abs(dx) > 4) state.current.moved = true;
			el.scrollLeft = state.current.scrollLeft - dx;
		}

		function onMouseUp(e: MouseEvent) {
			if (!state.current) return;
			// Se moveu, bloqueia click subsequente pra nao abrir card ao soltar
			if (state.current.moved) {
				const onClickCapture = (evt: MouseEvent) => {
					evt.stopPropagation();
					evt.preventDefault();
					window.removeEventListener("click", onClickCapture, true);
				};
				window.addEventListener("click", onClickCapture, true);
				setTimeout(
					() => window.removeEventListener("click", onClickCapture, true),
					50,
				);
			}
			state.current = null;
			if (el) {
				el.style.cursor = "";
				el.style.userSelect = "";
			}
		}

		el.addEventListener("mousedown", onMouseDown);
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);

		return () => {
			el.removeEventListener("mousedown", onMouseDown);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}, [enabled]);

	return ref;
}
