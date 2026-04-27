import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { organization, user } from "./postgres";

// =============================================
// OAuth Provider Tokens (multi-provider)
// =============================================

/**
 * Provedores OAuth integrados (outbound — app pede permissão de USAR
 * conta do usuário no provider, não autenticação inbound).
 *
 * Adicionar novo provider: estender enum e implementar adapter em
 * packages/whatsapp/oauth-{provider}/ ou similar.
 */
export const oauthProviderEnum = pgEnum("OAuthProvider", [
	"google",
	"microsoft",
	"meta",
	"slack",
]);

export type OAuthTokenMetadata = {
	googleCalendarSyncToken?: string;
	googleCalendarChannelId?: string;
	googleCalendarChannelExpiresAt?: string;
	webhookHealthy?: boolean;
	lastSyncAt?: string;
	[key: string]: unknown;
};

/**
 * Tokens OAuth criptografados (AES-256-GCM, chave em env
 * OAUTH_ENCRYPTION_KEY). Ver ADR-003.
 *
 * - accessTokenEnc: ciphertext "iv:tag:cipher" base64
 * - refreshTokenEnc: idem (pode ser null se provider não dá refresh)
 * - metadata: dados específicos do provider (sync tokens, channel IDs)
 *
 * Único por (org, user, provider) — usuário só tem 1 token ativo
 * por provider por org.
 */
export const oauthToken = pgTable(
	"oauth_token",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		provider: oauthProviderEnum("provider").notNull(),
		providerAccountId: text("providerAccountId").notNull(),
		scope: text("scope").notNull(),
		accessTokenEnc: text("accessTokenEnc").notNull(),
		refreshTokenEnc: text("refreshTokenEnc"),
		expiresAt: timestamp("expiresAt"),
		metadata: jsonb("metadata")
			.$type<OAuthTokenMetadata>()
			.notNull()
			.default({}),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("oauth_token_org_user_provider_idx").on(
			table.organizationId,
			table.userId,
			table.provider,
		),
		index("oauth_token_org_provider_idx").on(
			table.organizationId,
			table.provider,
		),
	],
);

export const oauthTokenRelations = relations(oauthToken, ({ one }) => ({
	organization: one(organization, {
		fields: [oauthToken.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [oauthToken.userId],
		references: [user.id],
	}),
}));
