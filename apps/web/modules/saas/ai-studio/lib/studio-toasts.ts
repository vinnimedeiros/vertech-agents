import { toast } from "sonner";

export const studioToasts = {
	saveSuccess: () => toast.success("Configurações salvas"),
	saveError: () =>
		toast.error("Não foi possível salvar. Tente novamente."),
	teamCreated: (name: string) => toast.success(`Time ${name} criado`),
	deployReady: () => toast.success("Time pronto para ativar"),
	deployBlocked: () => toast.warning("Existem pendências antes de ativar"),
	inspectorOpening: () =>
		toast.info("Abrindo Inspetor (Mastra Studio) em nova aba"),
	comingSoon: () => toast.info("Disponível em breve"),
	unknownError: () => toast.error("Algo deu errado. Tente novamente."),
};
