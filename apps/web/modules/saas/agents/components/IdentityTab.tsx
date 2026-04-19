"use client";

import { Button } from "@ui/components/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib";
import { updateAgentIdentityAction } from "../lib/actions";
import { useAgent } from "../lib/agent-context";
import {
	type AgentGender,
	identitySchema,
	type IdentityInput,
} from "../lib/schemas";
import { useAgentForm } from "../lib/use-agent-form";
import { AgentAvatarUpload } from "./AgentAvatarUpload";
import { DirtyStateBanner } from "./DirtyStateBanner";

const GENDER_OPTIONS: { value: AgentGender; label: string }[] = [
	{ value: "FEMININE", label: "Feminino" },
	{ value: "MASCULINE", label: "Masculino" },
];

type Props = {
	organizationSlug: string;
};

export function IdentityTab({ organizationSlug }: Props) {
	const agent = useAgent();
	const isArchived = agent.status === "ARCHIVED";

	const defaultValues: IdentityInput = {
		name: agent.name,
		role: agent.role,
		avatarUrl: agent.avatarUrl,
		// Se o agente ainda nao tem genero setado (ou tinha "NEUTRAL" legacy),
		// default pra FEMININE — user pode trocar pra MASCULINE a qualquer hora
		gender:
			agent.gender === "FEMININE" || agent.gender === "MASCULINE"
				? (agent.gender as AgentGender)
				: "FEMININE",
		description: agent.description,
	};

	const { form, onSubmit, onDiscard, isSubmitting } = useAgentForm({
		schema: identitySchema,
		defaultValues,
		action: async (values) => {
			await updateAgentIdentityAction(
				{ agentId: agent.id, ...values },
				organizationSlug,
			);
		},
		successMessage: "Identidade atualizada.",
	});

	const currentGender = form.watch("gender");
	const currentName = form.watch("name");
	const currentAvatarUrl = form.watch("avatarUrl");

	return (
		<div className="flex flex-col">
			<div className="mb-6">
				<h3 className="font-semibold text-foreground text-lg">Identidade</h3>
				<p className="mt-1 text-foreground/60 text-sm">
					Como o agente se apresenta pras pessoas.
				</p>
			</div>

			<Form {...form}>
				<form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
					{/* Avatar */}
					<div className="flex flex-col gap-2">
						<FormLabel>Avatar</FormLabel>
						<AgentAvatarUpload
							agentId={agent.id}
							name={currentName || agent.name}
							currentValue={currentAvatarUrl}
							disabled={isArchived}
							onChange={(path) =>
								form.setValue("avatarUrl", path, {
									shouldDirty: true,
								})
							}
						/>
					</div>

					{/* Nome */}
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Nome</FormLabel>
								<FormControl>
									<Input
										{...field}
										disabled={isArchived}
										maxLength={80}
										placeholder="Ex: Atendente Comercial Vertech"
									/>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Como o agente se identifica pras pessoas.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Função */}
					<FormField
						control={form.control}
						name="role"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Função</FormLabel>
								<FormControl>
									<Input
										{...field}
										value={field.value ?? ""}
										disabled={isArchived}
										maxLength={80}
										placeholder="Ex: Atendimento comercial"
									/>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Ex: SDR, Atendimento comercial, Qualificador.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Gênero */}
					<FormField
						control={form.control}
						name="gender"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Gênero</FormLabel>
								<div
									className="flex flex-wrap gap-2"
									role="radiogroup"
									aria-label="Gênero do agente"
								>
									{GENDER_OPTIONS.map((opt) => {
										const selected = currentGender === opt.value;
										return (
											<Button
												key={opt.value}
												type="button"
												variant={selected ? "primary" : "outline"}
												size="sm"
												role="radio"
												aria-checked={selected}
												disabled={isArchived}
												onClick={() => field.onChange(opt.value)}
												className={cn(
													"min-w-28",
													selected && "ring-2 ring-primary/40",
												)}
											>
												{opt.label}
											</Button>
										);
									})}
								</div>
								<p className="text-foreground/60 text-xs">
									Usado pra gerar pronomes corretos nas respostas do agente.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Descrição */}
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => {
							const length = field.value?.length ?? 0;
							return (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>Descrição</FormLabel>
										<span className="text-foreground/40 text-xs">
											{length} / 500
										</span>
									</div>
									<FormControl>
										<Textarea
											{...field}
											value={field.value ?? ""}
											disabled={isArchived}
											maxLength={500}
											rows={4}
											placeholder="Um resumo do que o agente faz (uso interno)."
											className="resize-none"
										/>
									</FormControl>
									<p className="text-foreground/60 text-xs">
										Uso interno. Não aparece pro cliente final.
									</p>
									<FormMessage />
								</FormItem>
							);
						}}
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
