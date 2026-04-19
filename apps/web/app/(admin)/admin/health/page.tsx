import { requireSuperadmin } from "@saas/auth/lib/superadmin-guard";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthResult = {
	component: string;
	status: "healthy" | "degraded" | "unhealthy";
	metrics: Record<string, number | string>;
	alerts: Array<{ severity: "warning" | "critical"; message: string }>;
	timestamp: string;
};

const COMPONENTS = ["queue", "mastra", "redis", "database"] as const;

async function fetchHealth(component: string): Promise<HealthResult | null> {
	try {
		const h = await headers();
		const cookie = h.get("cookie") ?? "";
		const host = h.get("host") ?? "localhost:3000";
		const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

		const res = await fetch(
			`${protocol}://${host}/api/admin/health/${component}`,
			{ headers: { cookie }, cache: "no-store" },
		);
		if (!res.ok) return null;
		return (await res.json()) as HealthResult;
	} catch {
		return null;
	}
}

function statusColor(status: HealthResult["status"]): string {
	if (status === "healthy") return "text-green-600 bg-green-50 border-green-200";
	if (status === "degraded")
		return "text-amber-600 bg-amber-50 border-amber-200";
	return "text-red-600 bg-red-50 border-red-200";
}

export default async function AdminHealthPage() {
	const denied = await requireSuperadmin();
	if (denied) {
		// Route handler retorna Response; aqui redireciona pro login
		redirect("/auth/login");
	}

	const results = await Promise.all(
		COMPONENTS.map(async (c) => ({
			component: c,
			data: await fetchHealth(c),
		})),
	);

	return (
		<div className="mx-auto max-w-5xl px-6 py-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Health Tech (preview)</h1>
					<p className="text-sm text-muted-foreground">
						Endpoints de saude dos componentes. Dashboard completo vem na
						Phase 10c.
					</p>
				</div>
				<div className="text-xs text-muted-foreground">
					Atualizado em{" "}
					{new Date().toLocaleTimeString("pt-BR", { timeStyle: "medium" })}
				</div>
			</div>

			<div className="grid gap-4">
				{results.map(({ component, data }) => (
					<div
						key={component}
						className={`rounded-lg border p-4 ${data ? statusColor(data.status) : "border-slate-200 bg-slate-50 text-slate-600"}`}
					>
						<div className="mb-2 flex items-center justify-between">
							<h2 className="text-lg font-medium capitalize">{component}</h2>
							<span className="rounded-full border border-current px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
								{data?.status ?? "unknown"}
							</span>
						</div>

						{data ? (
							<>
								{data.alerts.length > 0 && (
									<ul className="mb-3 space-y-1 text-sm">
										{data.alerts.map((alert, i) => (
											<li key={`${component}-alert-${i}`}>
												<strong>
													{alert.severity === "critical" ? "❌" : "⚠️"}
												</strong>{" "}
												{alert.message}
											</li>
										))}
									</ul>
								)}
								<details className="text-xs">
									<summary className="cursor-pointer font-mono">
										Metricas (expandir)
									</summary>
									<pre className="mt-2 overflow-x-auto rounded bg-white/50 p-3">
										{JSON.stringify(data.metrics, null, 2)}
									</pre>
								</details>
							</>
						) : (
							<p className="text-sm">
								Endpoint nao respondeu ou retornou erro.
							</p>
						)}
					</div>
				))}
			</div>

			<p className="mt-6 text-xs text-muted-foreground">
				Endpoints: <code>/api/admin/health/&#123;queue|mastra|redis|database&#125;</code>
			</p>
		</div>
	);
}
