import type { PropsWithChildren } from "react";

export default function AgentsLayout({ children }: PropsWithChildren) {
	return <div className="flex flex-col gap-6">{children}</div>;
}
