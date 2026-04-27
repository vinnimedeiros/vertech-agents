"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirmExit: () => void;
};

/**
 * AlertDialog de saida do chat do Arquiteto (story 09.2 AC7-8).
 *
 * Usado quando o user tenta voltar/sair com mudancas nao salvas. Oferece:
 * - [Continuar aqui]: cancela e fica no chat
 * - [Salvar rascunho e sair]: auto-save (a ser implementado em 09.5) + navega
 *
 * Nesta phase o "salvar" e sinonimo de "sair" — 09.5 vai injetar logica real
 * de flush do working memory antes de navegar.
 */
export function ExitDialog({ open, onOpenChange, onConfirmExit }: Props) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Você tem mudanças não salvas
					</AlertDialogTitle>
					<AlertDialogDescription>
						Se você sair agora, o rascunho atual será preservado e
						você poderá retomar depois pela tela de agentes.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Continuar aqui</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirmExit}>
						Salvar rascunho e sair
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
