import { db, eq, organization } from "@repo/database";

/**
 * Feature flags suportadas.
 * Adicionar novas aqui conforme forem introduzidas.
 */
export type FeatureKey =
	| "whatsapp"
	| "ai_agents"
	| "multi_agents"
	| "pipeline_advanced"
	| "calendar_sync"
	| "custom_domain"
	| "knowledge_base"
	| "whitelabel";

type FeaturesMap = Record<string, boolean>;

/**
 * Verifica se a feature está habilitada na organização.
 * Se não estiver explicitamente setada, herda do parent recursivamente.
 * Se nenhum ancestral tiver setado, retorna false (default).
 */
export async function hasFeature(
	organizationId: string,
	feature: FeatureKey,
): Promise<boolean> {
	const [row] = await db
		.select({
			features: organization.features,
			parentOrganizationId: organization.parentOrganizationId,
		})
		.from(organization)
		.where(eq(organization.id, organizationId))
		.limit(1);

	if (!row) {
		return false;
	}

	const features = (row.features as FeaturesMap | null) ?? {};

	if (feature in features) {
		return features[feature] === true;
	}

	if (row.parentOrganizationId) {
		return hasFeature(row.parentOrganizationId, feature);
	}

	return false;
}

/**
 * Seta o valor da feature na organização (não afeta ancestrais/descendentes).
 * Para remover e voltar a herdar do pai, usar `unsetFeature`.
 */
export async function setFeature(
	organizationId: string,
	feature: FeatureKey,
	enabled: boolean,
): Promise<void> {
	const [row] = await db
		.select({ features: organization.features })
		.from(organization)
		.where(eq(organization.id, organizationId))
		.limit(1);

	if (!row) {
		throw new Error("ORG_NOT_FOUND");
	}

	const features: FeaturesMap = {
		...((row.features as FeaturesMap | null) ?? {}),
		[feature]: enabled,
	};

	await db
		.update(organization)
		.set({ features })
		.where(eq(organization.id, organizationId));
}

/**
 * Remove a feature do map da organização, fazendo ela voltar a herdar do pai.
 */
export async function unsetFeature(
	organizationId: string,
	feature: FeatureKey,
): Promise<void> {
	const [row] = await db
		.select({ features: organization.features })
		.from(organization)
		.where(eq(organization.id, organizationId))
		.limit(1);

	if (!row) {
		throw new Error("ORG_NOT_FOUND");
	}

	const current = (row.features as FeaturesMap | null) ?? {};
	const { [feature]: _removed, ...rest } = current;

	await db
		.update(organization)
		.set({ features: rest })
		.where(eq(organization.id, organizationId));
}
