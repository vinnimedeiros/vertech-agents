/**
 * Dependency injection pro sync do Google Calendar (D.3 Wave B).
 *
 * **Por que este indirection existe:**
 * - @repo/queue precisa chamar `runFullSync` que vive em apps/web
 * - apps/web depende de @repo/queue
 * - Import direto criaria ciclo
 *
 * Em vez disso, apps/web/instrumentation.ts registra o runner neste registry.
 * Worker do Google sync usa runner injected via runtime — zero import
 * direto. Mesmo padrão do `outbound-sender.ts`.
 */

export type GoogleSyncRunResult = {
	ok: boolean;
	pulled: number;
	pushed: number;
	deleted: number;
	error?: string;
};

export type GoogleSyncRunner = (params: {
	organizationId: string;
	userId: string;
	force?: boolean;
}) => Promise<GoogleSyncRunResult>;

let registeredRunner: GoogleSyncRunner | null = null;

export function registerGoogleSyncRunner(runner: GoogleSyncRunner): void {
	registeredRunner = runner;
}

export function getGoogleSyncRunner(): GoogleSyncRunner | null {
	return registeredRunner;
}

export function clearGoogleSyncRunner(): void {
	registeredRunner = null;
}
