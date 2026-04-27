"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	DEFAULT_MODEL_ID,
	type SupportedModelProvider,
	getModelsByProvider,
} from "@repo/ai/models";
import { Button } from "@ui/components/button";
import { Card, CardContent } from "@ui/components/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createAgentAction } from "../lib/actions";

const formSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Nome precisa ter pelo menos 2 caracteres")
		.max(80, "Nome pode ter no máximo 80 caracteres"),
	role: z
		.string()
		.trim()
		.max(80, "Função pode ter no máximo 80 caracteres")
		.optional(),
	model: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
	organizationId: string;
	organizationSlug: string;
};

const PROVIDERS: { id: SupportedModelProvider; label: string }[] = [
	{ id: "openai", label: "OpenAI" },
	{ id: "anthropic", label: "Anthropic" },
];

export function NewAgentForm({ organizationId, organizationSlug }: Props) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			role: "",
			model: DEFAULT_MODEL_ID,
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				const res = (await createAgentAction(
					{
						organizationId,
						name: values.name,
						role: values.role || undefined,
						model: values.model,
					},
					organizationSlug,
				)) as { agentId: string };
				toast.success("Agente criado.");
				router.push(`/app/${organizationSlug}/agents/${res.agentId}`);
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível criar o agente.");
			}
		});
	});

	return (
		<Card className="mx-auto max-w-lg">
			<CardContent className="pt-6">
				<Form {...form}>
					<form onSubmit={onSubmit} className="flex flex-col gap-5">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nome</FormLabel>
									<FormControl>
										<Input
											{...field}
											autoFocus
											placeholder="Ex: Atendente Comercial Vertech"
											disabled={pending}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Função</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder="Ex: Atendimento comercial"
											disabled={pending}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="model"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Modelo</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={pending}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Escolha um modelo" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{PROVIDERS.map((p) => (
												<SelectGroup key={p.id}>
													<SelectLabel>
														{p.label}
													</SelectLabel>
													{getModelsByProvider(
														p.id,
													).map((m) => (
														<SelectItem
															key={m.id}
															value={m.id}
														>
															{m.label}
															{m.isDefault
																? " (recomendado)"
																: ""}
														</SelectItem>
													))}
												</SelectGroup>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="mt-2 flex items-center justify-end gap-2">
							<Button
								asChild
								variant="ghost"
								disabled={pending}
								type="button"
							>
								<Link href={`/app/${organizationSlug}/agents`}>
									Cancelar
								</Link>
							</Button>
							<Button type="submit" disabled={pending}>
								{pending ? (
									<>
										<Loader2Icon className="mr-2 size-4 animate-spin" />
										Criando...
									</>
								) : (
									"Criar agente"
								)}
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
