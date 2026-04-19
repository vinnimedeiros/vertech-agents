"use client";

import { cn } from "@ui/lib";
import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
	url: string;
	/** Duração em segundos, se conhecida (do schema da mensagem). Serve como fallback */
	durationHint?: number | null;
	/** Bubble outbound (usuário) ou inbound (contato) — muda paleta */
	variant?: "outbound" | "inbound";
};

/**
 * Gera alturas de barrinhas deterministicamente a partir da URL — assim
 * o mesmo áudio sempre exibe o mesmo "waveform" fake estável.
 * (Decodificar áudio pra waveform real é caro; isso resolve visualmente.)
 */
function seededBars(seed: string, count: number): number[] {
	let h = 0;
	for (let i = 0; i < seed.length; i++) {
		h = (h * 31 + seed.charCodeAt(i)) | 0;
	}
	const out: number[] = [];
	for (let i = 0; i < count; i++) {
		// xorshift barato
		h ^= h << 13;
		h ^= h >> 17;
		h ^= h << 5;
		const v = Math.abs(h) / 0x7fffffff; // 0..1
		// modula pra dar variação visível — alturas entre 25% e 100%
		out.push(0.25 + v * 0.75);
	}
	return out;
}

function formatTime(s: number): string {
	if (!isFinite(s) || s < 0) return "0:00";
	const mm = Math.floor(s / 60);
	const ss = Math.floor(s % 60)
		.toString()
		.padStart(2, "0");
	return `${mm}:${ss}`;
}

const BAR_COUNT = 40;

export function AudioPlayer({ url, durationHint, variant = "inbound" }: Props) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const barsRef = useRef<HTMLDivElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [duration, setDuration] = useState<number>(
		durationHint && durationHint > 0 ? durationHint : 0,
	);
	const [currentTime, setCurrentTime] = useState(0);

	const bars = useMemo(() => seededBars(url, BAR_COUNT), [url]);

	const progress = duration > 0 ? currentTime / duration : 0;
	const activeBarIndex = Math.floor(progress * BAR_COUNT);

	useEffect(() => {
		const el = audioRef.current;
		if (!el) return;

		const onLoaded = () => {
			if (el.duration && isFinite(el.duration)) {
				setDuration(el.duration);
			}
		};
		const onTimeUpdate = () => setCurrentTime(el.currentTime);
		const onEnded = () => {
			setIsPlaying(false);
			setCurrentTime(0);
		};
		const onPlay = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);

		el.addEventListener("loadedmetadata", onLoaded);
		el.addEventListener("durationchange", onLoaded);
		el.addEventListener("timeupdate", onTimeUpdate);
		el.addEventListener("ended", onEnded);
		el.addEventListener("play", onPlay);
		el.addEventListener("pause", onPause);

		return () => {
			el.removeEventListener("loadedmetadata", onLoaded);
			el.removeEventListener("durationchange", onLoaded);
			el.removeEventListener("timeupdate", onTimeUpdate);
			el.removeEventListener("ended", onEnded);
			el.removeEventListener("play", onPlay);
			el.removeEventListener("pause", onPause);
		};
	}, [url]);

	function toggle() {
		const el = audioRef.current;
		if (!el) return;
		if (el.paused) {
			void el.play();
		} else {
			el.pause();
		}
	}

	function seekFromPointer(clientX: number) {
		const el = audioRef.current;
		const container = barsRef.current;
		if (!el || !container || !duration) return;
		const rect = container.getBoundingClientRect();
		const ratio = Math.min(
			1,
			Math.max(0, (clientX - rect.left) / rect.width),
		);
		el.currentTime = ratio * duration;
		setCurrentTime(el.currentTime);
	}

	const isOutbound = variant === "outbound";

	return (
		<div className="flex items-center gap-3">
			<audio ref={audioRef} src={url} preload="metadata" />

			<button
				type="button"
				onClick={toggle}
				className={cn(
					"flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
					isOutbound
						? "bg-white/20 text-primary-foreground hover:bg-white/30"
						: "bg-primary text-primary-foreground hover:bg-primary/90",
				)}
				aria-label={isPlaying ? "Pausar" : "Tocar"}
			>
				{isPlaying ? (
					<PauseIcon className="size-4 fill-current" />
				) : (
					<PlayIcon className="ml-0.5 size-4 fill-current" />
				)}
			</button>

			<div className="flex min-w-0 flex-1 flex-col">
				<div
					ref={barsRef}
					onClick={(e) => seekFromPointer(e.clientX)}
					role="slider"
					tabIndex={0}
					aria-valuemin={0}
					aria-valuemax={Math.max(1, Math.round(duration))}
					aria-valuenow={Math.round(currentTime)}
					className="flex h-7 w-full cursor-pointer items-center gap-[2px]"
				>
					{bars.map((h, idx) => {
						const played = idx <= activeBarIndex;
						return (
							<span
								key={idx}
								style={{ height: `${Math.round(h * 100)}%` }}
								className={cn(
									"flex-1 rounded-full transition-colors",
									played
										? isOutbound
											? "bg-white"
											: "bg-primary"
										: isOutbound
											? "bg-white/35"
											: "bg-foreground/25",
								)}
							/>
						);
					})}
				</div>
				<span
					className={cn(
						"text-[10px] tabular-nums leading-tight",
						isOutbound ? "text-white/70" : "text-foreground/55",
					)}
				>
					{formatTime(isPlaying ? currentTime : duration)}
				</span>
			</div>
		</div>
	);
}
