import type { ReactNode } from "react";

export function PageHeader({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children?: ReactNode;
}) {
	return (
		<div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
			<div>
				<h2 className="font-bold text-2xl lg:text-3xl">{title}</h2>
				{subtitle ? (
					<p className="mt-1 opacity-60">{subtitle}</p>
				) : null}
			</div>
			{children ? (
				<div className="flex items-center gap-2">{children}</div>
			) : null}
		</div>
	);
}
