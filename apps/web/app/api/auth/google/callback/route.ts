import { requireOrgAccess } from "@repo/auth";
import { logger } from "@repo/logs";
import { getSession } from "@saas/auth/lib/server";
import {
	decodeIdTokenClaims,
	exchangeCodeForTokens,
} from "@saas/integrations/google/lib/oauth-client";
import {
	GOOGLE_OAUTH_ORG_COOKIE,
	GOOGLE_OAUTH_RETURN_COOKIE,
	GOOGLE_OAUTH_STATE_COOKIE,
	readGoogleOAuthEnv,
} from "@saas/integrations/google/lib/oauth-config";
import { saveGoogleToken } from "@saas/integrations/google/lib/oauth-storage";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_TARGET = "/app";

function buildErrorRedirect(returnTo: string, code: string): URL {
	const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
	const url = new URL(returnTo, base);
	url.searchParams.set("googleOauth", "error");
	url.searchParams.set("reason", code);
	return url;
}

function buildSuccessRedirect(returnTo: string): URL {
	const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
	const url = new URL(returnTo, base);
	url.searchParams.set("googleOauth", "success");
	return url;
}

export async function GET(req: Request) {
	const cookieStore = await cookies();
	const stateCookie = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? "";
	const returnToCookie =
		cookieStore.get(GOOGLE_OAUTH_RETURN_COOKIE)?.value ?? ERROR_TARGET;
	const orgIdCookie = cookieStore.get(GOOGLE_OAUTH_ORG_COOKIE)?.value ?? "";

	// Best-effort cleanup — independente de sucesso ou erro, o flow morre aqui.
	const clearCookies = () => {
		cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);
		cookieStore.delete(GOOGLE_OAUTH_RETURN_COOKIE);
		cookieStore.delete(GOOGLE_OAUTH_ORG_COOKIE);
	};

	const url = new URL(req.url);
	const queryError = url.searchParams.get("error");
	if (queryError) {
		clearCookies();
		return NextResponse.redirect(
			buildErrorRedirect(returnToCookie, queryError),
		);
	}

	const code = url.searchParams.get("code");
	const stateQuery = url.searchParams.get("state") ?? "";

	if (!code || !stateQuery) {
		clearCookies();
		return NextResponse.redirect(
			buildErrorRedirect(returnToCookie, "missing_code_or_state"),
		);
	}

	if (!stateCookie || stateQuery !== stateCookie) {
		logger.warn("[google-oauth/callback] state CSRF mismatch");
		clearCookies();
		return NextResponse.redirect(
			buildErrorRedirect(returnToCookie, "csrf_mismatch"),
		);
	}

	const env = readGoogleOAuthEnv();
	if (!env) {
		clearCookies();
		return NextResponse.redirect(
			buildErrorRedirect(returnToCookie, "not_configured"),
		);
	}

	const session = await getSession();
	if (!session?.user) {
		clearCookies();
		return NextResponse.redirect(
			buildErrorRedirect(returnToCookie, "unauthenticated"),
		);
	}

	if (!orgIdCookie) {
		clearCookies();
		return NextResponse.redirect(
			buildErrorRedirect(returnToCookie, "no_org_context"),
		);
	}

	try {
		await requireOrgAccess(session.user.id, orgIdCookie);
	} catch {
		clearCookies();
		return NextResponse.redirect(
			buildErrorRedirect(returnToCookie, "forbidden"),
		);
	}

	try {
		const tokens = await exchangeCodeForTokens(env, code);

		let email: string | null = null;
		let providerAccountId: string | null = null;
		let name: string | null = null;
		if (tokens.id_token) {
			try {
				const claims = decodeIdTokenClaims(tokens.id_token);
				email = claims.email ?? null;
				providerAccountId = claims.sub;
				name = claims.name ?? null;
			} catch (err) {
				logger.warn(
					{ err: err instanceof Error ? err.message : err },
					"[google-oauth/callback] id_token decode falhou — seguindo sem claims",
				);
			}
		}

		const expiresAt = tokens.expires_in
			? new Date(Date.now() + tokens.expires_in * 1000)
			: null;

		await saveGoogleToken({
			organizationId: orgIdCookie,
			userId: session.user.id,
			providerAccountId: providerAccountId ?? email ?? "unknown",
			scope: tokens.scope,
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token ?? null,
			expiresAt,
			metadata: {
				email: email ?? undefined,
				name: name ?? undefined,
				connectedAt: new Date().toISOString(),
			} as Record<string, unknown>,
		});

		clearCookies();
		return NextResponse.redirect(buildSuccessRedirect(returnToCookie));
	} catch (err) {
		logger.error(
			{ err: err instanceof Error ? err.message : err },
			"[google-oauth/callback] exchange ou save falhou",
		);
		clearCookies();
		return NextResponse.redirect(
			buildErrorRedirect(returnToCookie, "exchange_failed"),
		);
	}
}
