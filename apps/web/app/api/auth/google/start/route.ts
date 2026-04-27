import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { buildAuthorizationUrl } from "@saas/integrations/google/lib/oauth-client";
import {
	GOOGLE_OAUTH_COOKIE_MAX_AGE,
	GOOGLE_OAUTH_ORG_COOKIE,
	GOOGLE_OAUTH_RETURN_COOKIE,
	GOOGLE_OAUTH_STATE_COOKIE,
	readGoogleOAuthEnv,
} from "@saas/integrations/google/lib/oauth-config";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/start?returnTo=/app/{slug}/crm/integracoes
 *
 * Inicia OAuth Google Calendar:
 *  1. Valida sessão + organização ativa
 *  2. Gera CSRF token, seta cookies httpOnly (state, returnTo, orgId)
 *  3. Redireciona pra consent screen Google
 *
 * Callback em /api/auth/google/callback completa o flow.
 */
export async function GET(req: Request) {
	const env = readGoogleOAuthEnv();
	if (!env) {
		return NextResponse.json(
			{ error: "GOOGLE_OAUTH_NOT_CONFIGURED" },
			{ status: 503 },
		);
	}

	const session = await getSession();
	if (!session?.user) {
		return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
	}

	const url = new URL(req.url);
	const returnToParam = url.searchParams.get("returnTo");
	const organizationSlug = url.searchParams.get("slug") ?? "";

	const org = organizationSlug
		? await getActiveOrganization(organizationSlug)
		: null;
	if (!org) {
		return NextResponse.json(
			{ error: "ORGANIZATION_NOT_FOUND" },
			{ status: 400 },
		);
	}

	const sanitizedReturnTo =
		returnToParam && returnToParam.startsWith("/")
			? returnToParam
			: `/app/${organizationSlug}/crm/integracoes`;

	const csrf = randomBytes(32).toString("base64url");

	const cookieStore = await cookies();
	const isProd = process.env.NODE_ENV === "production";
	const cookieBase = {
		httpOnly: true,
		secure: isProd,
		// Lax permite cookie em redirect top-level cross-site (Google → app GET)
		sameSite: "lax" as const,
		path: "/",
		maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE,
	};
	cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, csrf, cookieBase);
	cookieStore.set(GOOGLE_OAUTH_RETURN_COOKIE, sanitizedReturnTo, cookieBase);
	cookieStore.set(GOOGLE_OAUTH_ORG_COOKIE, org.id, cookieBase);

	const authUrl = buildAuthorizationUrl(env, csrf, {
		loginHint: session.user.email ?? undefined,
	});

	return NextResponse.redirect(authUrl);
}
