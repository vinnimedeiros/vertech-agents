"use client";

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Textarea } from "@ui/components/textarea";
import { updateAgentConversationStyleAction } from "../lib/actions";
import { useAgent } from "../lib/agent-context";
import {
	type ConversationStyleInput,
	conversationStyleSchema,
} from "../lib/schemas";
import { useAgentForm } from "../lib/use-agent-form";
import { DirtyStateBanner } from "./DirtyStateBanner";
import { TagList } from "./TagList";

type Props = {
	organizationSlug: string;
};

export function ConversationTab({ organizationSlug }: Props) {
	const agent = useAgent();
	const isArchived = agent.status === "ARCHIVED";
	const style = agent.conversationStyle ?? {};

	const defaultValues: ConversationStyleInput = {
		greeting: style.greeting ?? null,
		qualificationQuestions: style.qualificationQuestions ?? [],
		objectionHandling: style.objectionHandling ?? null,
		handoffTriggers: style.handoffTriggers ?? [],
	};

	const { form, onSubmit, onDiscard, isSubmitting } = useAgentForm({
		schema: conversationStyleSchema,
		defaultValues,
		action: async (values) => {
			await updateAgentConversationStyleAction(
				{ agentId: agent.id, ...values },
				organizationSlug,
			);
		},
		successMessage: "Estilo de conversa atualizado.",
	});

	return (
		<div className="flex flex-col">
			<div className="mb-6">
				<h3 className="font-semibold text-foreground text-lg">Conversas</h3>
				<p className="mt-1 text-foreground/60 text-sm">
					Como o agente aborda a conversa: saudação, qualificação, objeções
					e quando chama humano.
				</p>
			</div>

			<Form {...form}>
				<form
					onSubmit={(e) => e.preventDefault()}
					className="flex flex-col gap-6"
				>
					<FormField
						control={form.control}
						name="greeting"
						render={({ field }) => {
							const length = field.value?.length ?? 0;
							return (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>Saudação padrão</FormLabel>
										<span className="text-foreground/40 text-xs">
											{length} / 300
										</span>
									</div>
									<FormControl>
										<Textarea
											{...field}
											value={field.value ?? ""}
											disabled={isArchived}
											maxLength={300}
											rows={2}
											placeholder="Primeira mensagem do agente. Ex: Oi! Sou a Maria da Vertech, posso te ajudar?"
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
						name="qualificationQuestions"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Perguntas de qualificação</FormLabel>
								<FormControl>
									<TagList
										value={field.value}
										onChange={field.onChange}
										maxItems={10}
										maxItemLength={200}
										placeholder="Ex: Qual o tamanho da empresa?"
										emptyLabel="Nenhuma pergunta cadastrada"
										disabled={isArchived}
									/>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Perguntas que o agente faz pra entender o cliente antes de
									oferecer algo. Máximo 10.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="objectionHandling"
						render={({ field }) => {
							const length = field.value?.length ?? 0;
							return (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>Tratamento de objeções</FormLabel>
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
											placeholder="Como o agente responde a 'tá caro', 'vou pensar', 'já tenho outro fornecedor'. Ex: Acolher com empatia, perguntar o porquê, trazer diferencial sem pressionar."
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
						name="handoffTriggers"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Gatilhos de handoff humano</FormLabel>
								<FormControl>
									<TagList
										value={field.value}
										onChange={field.onChange}
										maxItems={10}
										maxItemLength={150}
										placeholder="Ex: cliente pedir humano"
										emptyLabel="Nenhum gatilho cadastrado"
										disabled={isArchived}
									/>
								</FormControl>
								<p className="text-foreground/60 text-xs">
									Situações que transferem pra humano. Ex: cliente pedir
									humano, pergunta sobre valor fora das políticas, situação
									emocional delicada.
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
