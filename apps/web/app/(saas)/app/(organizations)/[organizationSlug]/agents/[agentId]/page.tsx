import { Card } from "@ui/components/card";
import { UserIcon } from "lucide-react";

/**
 * Aba Identidade (raiz do detalhe). Placeholder ate a story 07B.3
 * substituir por `<IdentityTab />` com o form completo.
 *
 * O shell (header + menu + banner) vive em `layout.tsx` irmao.
 */
export default function AgentIdentityPage() {
	return (
		<Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
				<UserIcon className="size-6 text-primary" />
			</div>
			<div>
				<h3 className="font-semibold text-foreground">
					Aba Identidade em breve
				</h3>
				<p className="mt-1 max-w-md text-foreground/60 text-sm">
					Story 07B.3 vai preencher esta aba com nome, função, avatar,
					gênero e descrição editáveis.
				</p>
			</div>
		</Card>
	);
}
