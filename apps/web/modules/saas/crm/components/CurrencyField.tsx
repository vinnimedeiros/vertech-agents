"use client";

import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { useEffect, useState } from "react";

/**
 * Campo monetário em R$ com máscara BRL.
 * Click-to-edit: mostra o valor formatado; ao clicar vira input numérico com máscara.
 * Persiste um number (ou null) no onSave.
 */

function formatBRL(n: number | null): string {
	if (n == null || Number.isNaN(n)) return "";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	}).format(n);
}

/** Recebe input bruto do user (com "R$", pontos, vírgulas, texto) e retorna número em reais */
function parseBRLInput(raw: string): number | null {
	// Tira tudo que não é dígito
	const digits = raw.replace(/\D/g, "");
	if (!digits) return null;
	// Os últimos 2 dígitos são centavos
	const cents = Number(digits);
	return cents / 100;
}

/** Formata enquanto digita: "1234" → "R$ 12,34" */
function maskWhileTyping(raw: string): string {
	const digits = raw.replace(/\D/g, "");
	if (!digits) return "";
	const cents = Number(digits);
	return formatBRL(cents / 100);
}

type CurrencyFieldProps = {
	value: string | number | null;
	onSave: (v: number | null) => void;
	placeholder?: string;
	className?: string;
};

export function CurrencyField({
	value,
	onSave,
	placeholder = "R$ 0,00",
	className,
}: CurrencyFieldProps) {
	const numValue = value == null ? null : Number(value);
	const displayValue = formatBRL(numValue);

	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(displayValue);

	useEffect(() => {
		setDraft(displayValue);
	}, [displayValue]);

	function commit() {
		const parsed = parseBRLInput(draft);
		if (parsed !== numValue) onSave(parsed);
		setEditing(false);
	}

	if (editing) {
		return (
			<Input
				type="text"
				inputMode="numeric"
				value={draft}
				onChange={(e) => setDraft(maskWhileTyping(e.target.value))}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						commit();
					}
					if (e.key === "Escape") {
						setDraft(displayValue);
						setEditing(false);
					}
				}}
				autoFocus
				placeholder={placeholder}
				className={cn("h-7 text-sm", className)}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setEditing(true)}
			className={cn(
				"w-full rounded px-1.5 py-0.5 text-left transition-colors hover:bg-muted",
				!numValue && "text-foreground/40",
				className,
			)}
		>
			{displayValue || placeholder || "—"}
		</button>
	);
}
