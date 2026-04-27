"use client";

import { formatPhoneBR } from "@saas/chat/lib/phone";
import { findExistingConversationWithContactAction } from "@saas/whatsapp-contacts/lib/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import {
	BriefcaseIcon,
	Loader2Icon,
	SearchIcon,
	UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type Props = {
	organizationSlug: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type ContactOption = {
	id: string;
	name: string;
	phone: string | null;
	photoUrl: string | null;
	isBusiness: boolean;
};

function initialsOf(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("");
}

/**
 * Modal estilo WhatsApp Web — botão "+". Abre busca global em todos os
 * contatos da org (clientes do CRM + contatos sincronizados do WhatsApp) e
 * inicia/abre conversa com quem for selecionado.
 */
export function NewConversationDialog({
	organizationSlug,
	open,
	onOpenChange,
}: Props) {
	const [q, setQ] = useState("");
	const [results, setResults] = useState<ContactOption[]>([]);
	const [loading, setLoading] = useState(false);
	const [pending, startTransition] = useTransition();
	const inputRef = useRef<HTMLInputElement>(null);
	const router = useRouter();

	useEffect(() => {
		if (open) {
			setQ("");
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open]);

	// Busca debounced
	useEffect(() => {
		if (!open) return;
		const controller = new AbortController();
		const t = setTimeout(async () => {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/chat/contacts-search?org=${encodeURIComponent(organizationSlug)}&q=${encodeURIComponent(q)}`,
					{ signal: controller.signal, cache: "no-store" },
				);
				if (!res.ok) throw new Error("falha na busca");
				const data = (await res.json()) as ContactOption[];
				setResults(data);
			} catch (err) {
				if ((err as Error).name !== "AbortError") {
					setResults([]);
				}
			} finally {
				setLoading(false);
			}
		}, 200);
		return () => {
			controller.abort();
			clearTimeout(t);
		};
	}, [q, open, organizationSlug]);

	function choose(contactId: string) {
		startTransition(async () => {
			try {
				const { conversationId } =
					await findExistingConversationWithContactAction(contactId);
				onOpenChange(false);
				if (conversationId) {
					router.push(`/app/${organizationSlug}/crm/chat/${conversationId}`);
				} else {
					router.push(`/app/${organizationSlug}/crm/chat/new/${contactId}`);
				}
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao abrir conversa",
				);
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Nova conversa</DialogTitle>
					<DialogDescription>
						Escolha um contato pra iniciar a conversa no WhatsApp.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3">
					<div className="relative">
						<SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-foreground/50" />
						<Input
							ref={inputRef}
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Buscar por nome ou telefone..."
							className="h-10 pl-8 text-sm"
						/>
					</div>

					<div className="-mx-1 max-h-[60vh] overflow-y-auto">
						{loading && results.length === 0 ? (
							<div className="flex items-center justify-center py-8 text-xs text-foreground/55">
								<Loader2Icon className="mr-2 size-3.5 animate-spin" />
								Buscando...
							</div>
						) : results.length === 0 ? (
							<p className="py-8 text-center text-xs text-foreground/55">
								{q.length === 0
									? "Nenhum contato disponível."
									: `Nenhum contato para "${q}".`}
							</p>
						) : (
							<ul className="flex flex-col gap-0.5">
								{results.map((c) => (
									<li key={c.id}>
										<button
											type="button"
											onClick={() => choose(c.id)}
											disabled={pending}
											className={cn(
												"flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
												"hover:bg-foreground/5 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
												"disabled:opacity-50",
											)}
										>
											<Avatar className="size-9 rounded-full shrink-0">
												{c.photoUrl ? (
													<AvatarImage
														src={c.photoUrl}
														alt={c.name}
														className="rounded-full"
													/>
												) : null}
												<AvatarFallback className="rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs">
													{initialsOf(c.name) || "?"}
												</AvatarFallback>
											</Avatar>
											<div className="flex min-w-0 flex-1 flex-col">
												<span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
													{c.name}
													{c.isBusiness ? (
														<BriefcaseIcon className="size-3 text-emerald-500" />
													) : null}
												</span>
												<span className="truncate text-[11px] text-foreground/55">
													{c.phone ? formatPhoneBR(c.phone) : "Sem telefone"}
												</span>
											</div>
											{!c.isBusiness ? (
												<UserIcon className="size-3 text-foreground/30" />
											) : null}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
