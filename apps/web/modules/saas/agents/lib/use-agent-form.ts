"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import {
	type DefaultValues,
	type UseFormReturn,
	useForm,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type UseAgentFormOptions<TSchema extends z.ZodTypeAny> = {
	schema: TSchema;
	defaultValues: DefaultValues<z.infer<TSchema>>;
	/**
	 * Server action invocada no submit. Recebe os values validados.
	 * Responsavel por UPDATE no DB + revalidatePath.
	 */
	action: (values: z.infer<TSchema>) => Promise<unknown>;
	/** Texto do toast de sucesso (singular, ex: "Identidade atualizada"). */
	successMessage: string;
	/** Texto do toast de erro (opcional, default: "Nao foi possivel salvar"). */
	errorMessage?: string;
};

type UseAgentFormReturn<TSchema extends z.ZodTypeAny> = {
	form: UseFormReturn<z.infer<TSchema>>;
	onSubmit: () => void;
	onDiscard: () => void;
	isSubmitting: boolean;
};

/**
 * Hook compartilhado pelas 6 abas do detalhe. Envolve react-hook-form com:
 * - zodResolver baseado no schema da aba
 * - submit via server action passada (com toast de sucesso/erro)
 * - reset pros novos valores apos sucesso (isDirty volta pra false)
 * - discard via form.reset() sem argumento (volta pros defaults)
 */
export function useAgentForm<TSchema extends z.ZodTypeAny>({
	schema,
	defaultValues,
	action,
	successMessage,
	errorMessage = "Não foi possível salvar.",
}: UseAgentFormOptions<TSchema>): UseAgentFormReturn<TSchema> {
	const [isSubmitting, startTransition] = useTransition();

	const form = useForm<z.infer<TSchema>>({
		resolver: zodResolver(schema) as never,
		defaultValues,
	});

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				await action(values);
				// Re-seta defaults pros valores recem-salvos → isDirty false
				form.reset(values as DefaultValues<z.infer<TSchema>>, {
					keepDirty: false,
				});
				toast.success(successMessage);
			} catch (err) {
				console.error(err);
				toast.error(errorMessage);
			}
		});
	});

	const onDiscard = () => {
		form.reset();
	};

	return { form, onSubmit, onDiscard, isSubmitting };
}
