import type { PropsWithChildren } from "react";
import { AppShell } from "./AppShell";

export function AppWrapper({ children }: PropsWithChildren) {
	return <AppShell>{children}</AppShell>;
}
