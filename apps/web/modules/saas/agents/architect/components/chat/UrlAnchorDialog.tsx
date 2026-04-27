"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { type FormEvent, useEffect, useState } from "react";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (url: string) => void;
};

/**
 * Dialog pra anexar URL de site como fonte de conhecimento (story 09.4).
 *
 * Validação client: exige http:// ou https://. Server valida de novo e faz
 * scrape do título antes de enfileirar ingest completo.
 */
export function UrlAnchorDialog({ open, onOpenChange, onSubmit }: Props) {
	const [url, setUrl] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) {
			setUrl("");
			setError(null);
		}
	}, [open]);

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const trimmed = url.trim();
		if (!trimmed) {
			setError("Cole uma URL.");
			return;
		}
		const lower = trimmed.toLowerCase();
		if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
			setError("A URL precisa começar com http:// ou https://.");
			return;
		}
		onSubmit(trimmed);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Anexar link</DialogTitle>
					<DialogDescription>
						Cole uma URL. O Arquiteto acessa e usa o conteúdo como
						fonte de conhecimento do agente.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<Input
						autoFocus
						type="url"
						placeholder="https://exemplo.com/produtos"
						value={url}
						onChange={(e) => {
							setUrl(e.target.value);
							if (error) setError(null);
						}}
						aria-invalid={error ? "true" : undefined}
						aria-describedby={
							error ? "url-dialog-error" : undefined
						}
					/>
					{error ? (
						<p
							id="url-dialog-error"
							className="text-destructive text-sm"
							role="alert"
						>
							{error}
						</p>
					) : null}
					<DialogFooter className="gap-2 sm:gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit">Anexar</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
