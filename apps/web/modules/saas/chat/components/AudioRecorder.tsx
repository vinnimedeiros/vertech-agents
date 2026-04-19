"use client";

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import {
	MicIcon,
	PlayIcon,
	SendHorizontalIcon,
	SquareIcon,
	Trash2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Phase = "recording" | "preview";

type Props = {
	onSend: (blob: Blob, durationSeconds: number) => void | Promise<void>;
	onCancel: () => void;
};

function formatDuration(s: number): string {
	const mm = Math.floor(s / 60)
		.toString()
		.padStart(1, "0");
	const ss = Math.floor(s % 60)
		.toString()
		.padStart(2, "0");
	return `${mm}:${ss}`;
}

export function AudioRecorder({ onSend, onCancel }: Props) {
	const [phase, setPhase] = useState<Phase>("recording");
	const [seconds, setSeconds] = useState(0);
	const [blob, setBlob] = useState<Blob | null>(null);
	const [blobUrl, setBlobUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isSending, setIsSending] = useState(false);

	const recorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const startedAtRef = useRef<number>(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Inicia gravação no mount
	useEffect(() => {
		let mounted = true;

		(async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
				if (!mounted) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}
				streamRef.current = stream;
				const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
					? "audio/webm;codecs=opus"
					: "audio/webm";
				const recorder = new MediaRecorder(stream, { mimeType: mime });
				chunksRef.current = [];
				recorder.ondataavailable = (e) => {
					if (e.data.size > 0) chunksRef.current.push(e.data);
				};
				recorder.onstop = () => {
					const merged = new Blob(chunksRef.current, { type: mime });
					chunksRef.current = [];
					setBlob(merged);
					const url = URL.createObjectURL(merged);
					setBlobUrl(url);
					setPhase("preview");
				};
				recorderRef.current = recorder;
				recorder.start();
				startedAtRef.current = Date.now();
				timerRef.current = setInterval(() => {
					setSeconds((Date.now() - startedAtRef.current) / 1000);
				}, 250);
			} catch (err) {
				console.error("[AudioRecorder] mic error", err);
				setError(
					"Não consegui acessar o microfone. Verifique permissões do navegador.",
				);
			}
		})();

		return () => {
			mounted = false;
			if (timerRef.current) clearInterval(timerRef.current);
			if (recorderRef.current && recorderRef.current.state !== "inactive") {
				try {
					recorderRef.current.stop();
				} catch {}
			}
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((t) => t.stop());
				streamRef.current = null;
			}
		};
	}, []);

	// Libera URL do blob ao desmontar
	useEffect(() => {
		return () => {
			if (blobUrl) URL.revokeObjectURL(blobUrl);
		};
	}, [blobUrl]);

	function handleStop() {
		if (recorderRef.current && recorderRef.current.state === "recording") {
			recorderRef.current.stop();
		}
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((t) => t.stop());
			streamRef.current = null;
		}
	}

	async function handleSend() {
		if (!blob) return;
		setIsSending(true);
		try {
			await onSend(blob, Math.max(1, Math.round(seconds)));
		} finally {
			setIsSending(false);
		}
	}

	if (error) {
		return (
			<div className="flex items-center justify-between gap-3 rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
				<span>{error}</span>
				<Button size="sm" variant="ghost" onClick={onCancel}>
					Fechar
				</Button>
			</div>
		);
	}

	if (phase === "recording") {
		return (
			<div className="flex items-center gap-3 rounded-md bg-rose-500/10 px-3 py-2">
				<span className="relative flex size-2.5 shrink-0">
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500 opacity-75" />
					<span className="relative inline-flex size-full rounded-full bg-rose-500" />
				</span>
				<div className="flex flex-1 items-center gap-2 text-sm">
					<MicIcon className="size-4 text-rose-400" />
					<span className="tabular-nums text-foreground/80">
						{formatDuration(seconds)}
					</span>
					<span className="text-xs text-foreground/55">gravando…</span>
				</div>
				<button
					type="button"
					onClick={onCancel}
					className="rounded-md p-1.5 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
					title="Descartar"
				>
					<Trash2Icon className="size-4" />
				</button>
				<Button
					type="button"
					size="sm"
					onClick={handleStop}
					className="gap-1.5"
				>
					<SquareIcon className="size-3.5 fill-current" />
					Parar
				</Button>
			</div>
		);
	}

	// Preview phase
	return (
		<div className="flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2">
			<PlayIcon className="size-4 text-foreground/50" />
			{blobUrl ? (
				<audio
					controls
					src={blobUrl}
					className="h-8 min-w-0 flex-1"
					preload="metadata"
				/>
			) : null}
			<span className="shrink-0 tabular-nums text-xs text-foreground/55">
				{formatDuration(seconds)}
			</span>
			<button
				type="button"
				onClick={onCancel}
				className="rounded-md p-1.5 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
				title="Descartar"
			>
				<Trash2Icon className="size-4" />
			</button>
			<Button
				type="button"
				size="sm"
				onClick={handleSend}
				disabled={isSending || !blob}
				className={cn("gap-1.5")}
			>
				<SendHorizontalIcon className="size-3.5" />
				Enviar
			</Button>
		</div>
	);
}
