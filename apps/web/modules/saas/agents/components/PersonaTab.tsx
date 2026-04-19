"use client";

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { updateAgentPersonaAction } from "../lib/actions";
import { useAgent } from "../lib/agent-context";
import {
	type EmpathyLevel,
	type Formality,
	type Humor,
	personalitySchema,
	type PersonalityInput,
	type Tone,
} from "../lib/schemas";
import { useAgentForm } from "../lib/use-agent-form";
import { DirtyStateBanner } from "./DirtyStateBanner";
import { OptionGroup } from "./OptionGroup";

const TONE_OPTIONS: readonly { value: Tone; label: string }[] = [
	{ value: "formal", label: "Formal" },
	{ value: "semiformal", label: "Semiformal" },
	{ value: "informal", label: "Informal" },
	{ value: "descontraido", label: "Descontraído" },
] as const;

const FORMALITY_OPTIONS: readonly { value: Formality; label: string }[] = [
	{ value: "voce_sem_girias", label: "Você sem gírias" },
	{ value: "tu", label: "Tu" },
	{ value: "vc_girias", label: "Você com gírias" },
	{ value: "formal", label: "Sr./Sra." },
] as const;

const HUMOR_OPTIONS: readonly { value: Humor; label: string }[] = [
	{ value: "sem_humor", label: "Sem humor" },
	{ value: "seco", label: "Seco" },
	{ value: "leve", label: "Leve" },
	{ value: "descontraido", label: "Descontraído" },
] as const;

const EMPATHY_OPTIONS: readonly { value: EmpathyLevel; label: string }[] = [
	{ value: "baixa", label: "Baixa" },
	{ value: "media", label: "Média" },
	{ value: "alta", label: "Alta" },
] as const;

type Props = {
	organizationSlug: string;
};

export function PersonaTab({ organizationSlug }: Props) {
	const agent = useAgent();
	const isArchived = agent.status === "ARCHIVED";
	const personality = agent.personality ?? {};

	// Defaults se o agente ainda nao tiver persona setada (comum pra agentes
	// criados via form MVP em 07B.1).
	const defaultValues: PersonalityInput = {
		tone: (personality.tone as Tone) ?? "semiformal",
		formality: (personality.formality as Formality) ?? "voce_sem_girias",
		humor: (personality.humor as Humor) ?? "leve",
		empathyLevel: (personality.empathyLevel as EmpathyLevel) ?? "alta",
	};

	const { form, onSubmit, onDiscard, isSubmitting } = useAgentForm({
		schema: personalitySchema,
		defaultValues,
		action: async (values) => {
			await updateAgentPersonaAction(
				{ agentId: agent.id, ...values },
				organizationSlug,
			);
		},
		successMessage: "Persona atualizada.",
	});

	return (
		<div className="flex flex-col">
			<div className="mb-6">
				<h3 className="font-semibold text-foreground text-lg">Persona</h3>
				<p className="mt-1 text-foreground/60 text-sm">
					Como o agente soa nas conversas — escolha o jeito de falar em cada
					um dos 4 eixos.
				</p>
			</div>

			<Form {...form}>
				<form
					onSubmit={(e) => e.preventDefault()}
					className="flex flex-col gap-6"
				>
					<FormField
						control={form.control}
						name="tone"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Tom</FormLabel>
								<FormControl>
									<OptionGroup<Tone>
										value={field.value}
										onChange={field.onChange}
										options={TONE_OPTIONS}
										ariaLabel="Tom do agente"
										disabled={isArchived}
									/>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Postura geral do agente na conversa.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="formality"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Formalidade</FormLabel>
								<FormControl>
									<OptionGroup<Formality>
										value={field.value}
										onChange={field.onChange}
										options={FORMALITY_OPTIONS}
										ariaLabel="Nível de formalidade"
										disabled={isArchived}
									/>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Como o agente se refere ao contato (tu, você, senhor/senhora).
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="humor"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Humor</FormLabel>
								<FormControl>
									<OptionGroup<Humor>
										value={field.value}
										onChange={field.onChange}
										options={HUMOR_OPTIONS}
										ariaLabel="Humor do agente"
										disabled={isArchived}
									/>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Espaço que o agente dá pra leveza nas respostas.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="empathyLevel"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Empatia</FormLabel>
								<FormControl>
									<OptionGroup<EmpathyLevel>
										value={field.value}
										onChange={field.onChange}
										options={EMPATHY_OPTIONS}
										ariaLabel="Nível de empatia"
										disabled={isArchived}
									/>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Quanto o agente acolhe sentimentos antes de resolver.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>
				</form>
			</Form>

			{!isArchived ? (
				<DirtyStateBanner
					form={form}
					onSubmit={onSubmit}
					onDiscard={onDiscard}
					isSubmitting={isSubmitting}
					className="mt-8"
				/>
			) : null}
		</div>
	);
}
