"use client";

import { Button } from "@ui/components/button";
import { CheckIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
	ArchitectArtifact,
	BusinessProfileContent,
} from "../../lib/artifact-types";

type BlueprintContent = {
	persona: {
		name: string;
		gender: "FEMININE" | "MASCULINE";
		tone: number;
		empathy: number;
	};
	capabilities: string[];
};

const CAPABILITY_LABELS: Record<string, string> = {
	qualification: "Qualificação",
	scheduling: "Agendamento",
	faq: "FAQ",
	handoff: "Handoff humano",
	followup: "Follow-up",
};

type Props = {
	sessionId: string;
	organizationSlug: string;
	businessProfile: ArchitectArtifact;
	blueprint: ArchitectArtifact;
};

/**
 * Step 4 do wizard (Criação final).
 *
 * Mostra resumo da criação (nome + função + capacidades) e botão único
 * "Criar agente" → POST /api/architect/sessions/[id]/publish (transação
 * atômica) → redirect pra painel do agente.
 */
export function CreationStep({
	sessionId,
	organizationSlug,
	businessProfile,
	blueprint,
}: Props) {
	const [isPublishing, setIsPublishing] = useState(false);
	const [publishedAgentId, setPublishedAgentId] = useState<string | null>(
		null,
	);

	const profile = businessProfile.content as BusinessProfileContent;
	const plan = blueprint.content as BlueprintContent;
	const identity = profile.suggestedIdentity;

	const handlePublish = async () => {
		if (isPublishing || publishedAgentId) return;
		setIsPublishing(true);
		try {
			const res = await fetch(
				`/api/architect/sessions/${sessionId}/publish`,
				{ method: "POST" },
			);
			const data = (await res.json().catch(() => null)) as {
				agent?: { id: string; name: string };
				message?: string;
			} | null;
			if (!res.ok || !data?.agent) {
				throw new Error(
					data?.message ?? "Não consegui criar o agente.",
				);
			}
			toast.success(`Agente ${data.agent.name} criado.`);
			setPublishedAgentId(data.agent.id);
			setTimeout(() => {
				window.location.href = `/app/${organizationSlug}/agents/${data.agent?.id}`;
			}, 1200);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Erro ao criar o agente. Tente novamente.",
			);
			setIsPublishing(false);
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-6 md:px-6">
			<header className="text-center">
				<h1 className="font-semibold text-2xl text-foreground">
					Tudo pronto!
				</h1>
				<p className="mt-1 text-foreground/60 text-sm">
					Revise o resumo e crie seu agente.
				</p>
			</header>

			<article className="rounded-xl border border-border bg-card p-6">
				<h2 className="mb-5 font-semibold text-foreground text-lg">
					Resumo da criação
				</h2>

				<div className="space-y-4">
					<Row
						label="Agente"
						value={plan.persona.name}
					/>
					<Row
						label="Função"
						value={identity?.role ?? "—"}
					/>
					<Row
						label="Negócio"
						value={profile.businessName}
					/>
					<Row
						label="Tom"
						value={identity?.toneKeyword ?? "profissional"}
					/>
					<div>
						<p className="mb-2 text-foreground/60 text-xs uppercase tracking-wide">
							Capacidades
						</p>
						<div className="flex flex-wrap gap-1.5">
							{plan.capabilities.map((c) => (
								<span
									key={c}
									className="rounded-full bg-primary/10 px-2.5 py-1 text-primary text-xs"
								>
									{CAPABILITY_LABELS[c] ?? c}
								</span>
							))}
						</div>
					</div>
				</div>
			</article>

			<footer className="flex justify-center pt-2">
				{publishedAgentId ? (
					<div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 font-medium text-emerald-700 text-sm dark:text-emerald-400">
						<CheckIcon className="size-4" />
						Agente criado. Redirecionando...
					</div>
				) : (
					<Button
						size="lg"
						onClick={handlePublish}
						disabled={isPublishing}
						className="gap-2"
					>
						{isPublishing ? (
							<>
								<Loader2Icon className="size-4 animate-spin" />
								Criando agente...
							</>
						) : (
							<>
								<SparklesIcon className="size-4" />
								Criar agente {plan.persona.name}
							</>
						)}
					</Button>
				)}
			</footer>
		</div>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4">
			<p className="text-foreground/60 text-xs uppercase tracking-wide">
				{label}
			</p>
			<p className="font-medium text-foreground text-sm">{value}</p>
		</div>
	);
}
