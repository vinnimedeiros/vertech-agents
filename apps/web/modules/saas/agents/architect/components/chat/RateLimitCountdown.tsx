"use client";

import { ClockIcon } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
	untilMs: number;
};

/**
 * Countdown visual do rate limit (story 09.10).
 *
 * Aparece no composer durante janela de bloqueio. Atualiza a cada 1s.
 * Some sozinho quando contagem chega a zero.
 */
export function RateLimitCountdown({ untilMs }: Props) {
	const [remaining, setRemaining] = useState(() =>
		Math.max(0, Math.ceil((untilMs - Date.now()) / 1000)),
	);

	useEffect(() => {
		const tick = () => {
			const next = Math.max(0, Math.ceil((untilMs - Date.now()) / 1000));
			setRemaining(next);
		};
		tick();
		const timer = window.setInterval(tick, 1000);
		return () => window.clearInterval(timer);
	}, [untilMs]);

	if (remaining <= 0) return null;

	return (
		<div
			className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-amber-700 text-xs dark:text-amber-400"
			aria-live="polite"
		>
			<ClockIcon className="size-3" />
			<span>
				Aguarde {remaining}s pro Arquiteto processar suas mensagens.
			</span>
		</div>
	);
}
