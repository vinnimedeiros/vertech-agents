import { Card } from "@ui/components/card";
import type { LucideIcon } from "lucide-react";
import { SparklesIcon } from "lucide-react";

type ComingSoonProps = {
	title?: string;
	description?: string;
	icon?: LucideIcon;
};

export function ComingSoon({
	title = "Em breve",
	description = "Esta funcionalidade está em desenvolvimento e ficará disponível em breve.",
	icon: Icon = SparklesIcon,
}: ComingSoonProps) {
	return (
		<Card className="mt-6">
			<div className="flex flex-col items-center justify-center px-8 py-16 text-center">
				<div className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
					<Icon className="size-8" />
				</div>
				<h3 className="font-semibold text-foreground/80 text-lg">
					{title}
				</h3>
				<p className="mt-2 max-w-md text-foreground/50 text-sm">
					{description}
				</p>
			</div>
		</Card>
	);
}
