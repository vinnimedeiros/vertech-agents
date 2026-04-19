"use client";

import {
	findModel,
	getDefaultModelForProvider,
	getModelsByProvider,
	type SupportedModelProvider,
} from "@repo/ai/models";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Slider } from "@ui/components/slider";
import { updateAgentModelAction } from "../lib/actions";
import { useAgent } from "../lib/agent-context";
import { type ModelConfigInput, modelConfigSchema } from "../lib/schemas";
import { useAgentForm } from "../lib/use-agent-form";
import { DirtyStateBanner } from "./DirtyStateBanner";
import { OptionGroup } from "./OptionGroup";

const PROVIDER_OPTIONS: readonly {
	value: SupportedModelProvider;
	label: string;
}[] = [
	{ value: "openai", label: "OpenAI" },
	{ value: "anthropic", label: "Anthropic" },
] as const;

type Props = {
	organizationSlug: string;
};

export function ModelTab({ organizationSlug }: Props) {
	const agent = useAgent();
	const isArchived = agent.status === "ARCHIVED";

	const defaultValues: ModelConfigInput = {
		model: agent.model,
		temperature: agent.temperature,
		maxSteps: agent.maxSteps,
	};

	const { form, onSubmit, onDiscard, isSubmitting } = useAgentForm({
		schema: modelConfigSchema,
		defaultValues,
		action: async (values) => {
			await updateAgentModelAction(
				{ agentId: agent.id, ...values },
				organizationSlug,
			);
		},
		successMessage: "Modelo atualizado.",
	});

	const currentModel = form.watch("model");
	const currentProvider =
		findModel(currentModel)?.provider ?? "openai";
	const availableModels = getModelsByProvider(currentProvider);

	const handleProviderChange = (newProvider: SupportedModelProvider) => {
		if (newProvider === currentProvider) return;
		const first = getDefaultModelForProvider(newProvider);
		form.setValue("model", first.id, { shouldDirty: true });
	};

	return (
		<div className="flex flex-col">
			<div className="mb-6">
				<h3 className="font-semibold text-foreground text-lg">Modelo</h3>
				<p className="mt-1 text-foreground/60 text-sm">
					Escolha o cérebro do agente e ajuste o estilo de resposta.
				</p>
			</div>

			<Form {...form}>
				<form
					onSubmit={(e) => e.preventDefault()}
					className="flex flex-col gap-6"
				>
					<FormItem>
						<FormLabel>Provider</FormLabel>
						<OptionGroup<SupportedModelProvider>
							value={currentProvider}
							onChange={handleProviderChange}
							options={PROVIDER_OPTIONS}
							ariaLabel="Provider do modelo"
							disabled={isArchived}
						/>
						<p className="text-foreground/60 text-xs">
							Qual empresa fornece o modelo (OpenAI ou Anthropic).
						</p>
					</FormItem>

					<FormField
						control={form.control}
						name="model"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Modelo</FormLabel>
								<Select
									value={field.value}
									onValueChange={field.onChange}
									disabled={isArchived}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Escolha um modelo" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectGroup>
											<SelectLabel>
												{currentProvider === "openai" ? "OpenAI" : "Anthropic"}
											</SelectLabel>
											{availableModels.map((m) => (
												<SelectItem key={m.id} value={m.id}>
													{m.label}
													{m.isDefault ? " (recomendado)" : ""}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<p className="text-foreground/60 text-xs">
									O modelo específico que gera as respostas.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="temperature"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center justify-between">
									<FormLabel>Temperatura</FormLabel>
									<span className="font-mono text-foreground text-sm tabular-nums">
										{field.value.toFixed(1)}
									</span>
								</div>
								<FormControl>
									<div className="flex flex-col gap-1 pt-2">
										<Slider
											value={[field.value]}
											onValueChange={(vals) =>
												field.onChange(
													Math.round(((vals[0] ?? 0) + Number.EPSILON) * 10) /
														10,
												)
											}
											min={0}
											max={2}
											step={0.1}
											disabled={isArchived}
											aria-label="Temperatura"
										/>
										<div className="flex justify-between text-foreground/50 text-xs">
											<span>Preciso (0.0)</span>
											<span>Criativo (2.0)</span>
										</div>
									</div>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Quanto maior, mais variadas e criativas as respostas. Na
									dúvida, mantenha 0.7.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="maxSteps"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center justify-between">
									<FormLabel>Máximo de passos</FormLabel>
									<span className="font-mono text-foreground text-sm tabular-nums">
										{field.value}
									</span>
								</div>
								<FormControl>
									<div className="flex flex-col gap-1 pt-2">
										<Slider
											value={[field.value]}
											onValueChange={(vals) =>
												field.onChange(Math.round(vals[0] ?? 1))
											}
											min={1}
											max={20}
											step={1}
											disabled={isArchived}
											aria-label="Máximo de passos"
										/>
										<div className="flex justify-between text-foreground/50 text-xs">
											<span>1 passo</span>
											<span>20 passos</span>
										</div>
									</div>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Quantas ferramentas o agente pode encadear numa mesma
									resposta. Na dúvida, mantenha 10.
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
