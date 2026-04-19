"use client";

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
import { updateAgentBusinessContextAction } from "../lib/actions";
import { useAgent } from "../lib/agent-context";
import {
	type BusinessContextInput,
	businessContextSchema,
} from "../lib/schemas";
import { useAgentForm } from "../lib/use-agent-form";
import { DirtyStateBanner } from "./DirtyStateBanner";
import { TagList } from "./TagList";

type Props = {
	organizationSlug: string;
};

export function BusinessTab({ organizationSlug }: Props) {
	const agent = useAgent();
	const isArchived = agent.status === "ARCHIVED";
	const business = agent.businessContext ?? {};

	const defaultValues: BusinessContextInput = {
		industry: business.industry ?? null,
		products: business.products ?? null,
		pricing: business.pricing ?? null,
		policies: business.policies ?? null,
		inviolableRules: business.inviolableRules ?? [],
	};

	const { form, onSubmit, onDiscard, isSubmitting } = useAgentForm({
		schema: businessContextSchema,
		defaultValues,
		action: async (values) => {
			await updateAgentBusinessContextAction(
				{ agentId: agent.id, ...values },
				organizationSlug,
			);
		},
		successMessage: "Contexto de negócio atualizado.",
	});

	return (
		<div className="flex flex-col">
			<div className="mb-6">
				<h3 className="font-semibold text-foreground text-lg">Negócio</h3>
				<p className="mt-1 text-foreground/60 text-sm">
					O que o agente sabe sobre o seu negócio (indústria, produtos,
					políticas) e as regras que ele nunca pode quebrar.
				</p>
			</div>

			<Form {...form}>
				<form
					onSubmit={(e) => e.preventDefault()}
					className="flex flex-col gap-6"
				>
					<FormField
						control={form.control}
						name="industry"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Indústria</FormLabel>
								<FormControl>
									<Input
										{...field}
										value={field.value ?? ""}
										disabled={isArchived}
										maxLength={80}
										placeholder="Ex: SaaS empresarial, Consultoria financeira"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="products"
						render={({ field }) => {
							const length = field.value?.length ?? 0;
							return (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>Produtos e serviços</FormLabel>
										<span className="text-foreground/40 text-xs">
											{length} / 2000
										</span>
									</div>
									<FormControl>
										<Textarea
											{...field}
											value={field.value ?? ""}
											disabled={isArchived}
											maxLength={2000}
											rows={6}
											placeholder="Liste o que o agente pode oferecer. Ex: Plataforma de gestão com planos Basic, Pro e Enterprise"
											className="resize-none"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>

					<FormField
						control={form.control}
						name="pricing"
						render={({ field }) => {
							const length = field.value?.length ?? 0;
							return (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>Política de preços</FormLabel>
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
											rows={3}
											placeholder="Como o agente trata perguntas sobre valor. Ex: Sob consulta. Nunca inventar valores."
											className="resize-none"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>

					<FormField
						control={form.control}
						name="policies"
						render={({ field }) => {
							const length = field.value?.length ?? 0;
							return (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>Políticas importantes</FormLabel>
										<span className="text-foreground/40 text-xs">
											{length} / 1000
										</span>
									</div>
									<FormControl>
										<Textarea
											{...field}
											value={field.value ?? ""}
											disabled={isArchived}
											maxLength={1000}
											rows={4}
											placeholder="Regras do negócio. Ex: LGPD-compliant, respeitar opt-out, disclaimer obrigatório."
											className="resize-none"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>

					<FormField
						control={form.control}
						name="inviolableRules"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Regras invioláveis</FormLabel>
								<FormControl>
									<TagList
										value={field.value}
										onChange={field.onChange}
										maxItems={20}
										maxItemLength={200}
										placeholder="Ex: Nunca prometer preços sem consultar humano"
										emptyLabel="Nenhuma regra cadastrada"
										disabled={isArchived}
									/>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Regras que o agente NUNCA pode quebrar, mesmo se o cliente
									insistir.
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
