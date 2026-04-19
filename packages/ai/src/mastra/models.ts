/**
 * Lista curada de modelos LLM suportados pelo agente comercial.
 *
 * Formato do `id` segue padrao Vercel AI SDK: `{provider}/{model-id}`.
 * Default confirmado em Phase 07A.1 (docs/phase-07/dependencies-confirmed.md).
 */

export type SupportedModelProvider = "openai" | "anthropic";

export type SupportedModel = {
	id: string;
	label: string;
	provider: SupportedModelProvider;
	isDefault?: boolean;
};

export const SUPPORTED_MODELS: readonly SupportedModel[] = [
	{
		id: "openai/gpt-4.1-mini",
		label: "GPT-4.1 mini",
		provider: "openai",
		isDefault: true,
	},
	{ id: "openai/gpt-4.1", label: "GPT-4.1", provider: "openai" },
	{ id: "openai/gpt-4o-mini", label: "GPT-4o mini", provider: "openai" },
	{
		id: "anthropic/claude-haiku-4-5",
		label: "Claude Haiku 4.5",
		provider: "anthropic",
	},
	{
		id: "anthropic/claude-sonnet-4-6",
		label: "Claude Sonnet 4.6",
		provider: "anthropic",
	},
] as const;

export const DEFAULT_MODEL_ID = "openai/gpt-4.1-mini" as const;

export const SUPPORTED_MODEL_IDS = SUPPORTED_MODELS.map(
	(m) => m.id,
) as readonly string[];

/**
 * Busca um modelo pelo ID. Retorna `null` se nao existir.
 */
export function findModel(id: string): SupportedModel | null {
	return SUPPORTED_MODELS.find((m) => m.id === id) ?? null;
}

/**
 * Retorna o label curto do modelo (ex: "GPT-4.1 mini") ou o proprio ID como
 * fallback se o modelo nao estiver no registry.
 */
export function getModelLabel(id: string): string {
	return findModel(id)?.label ?? id;
}

/**
 * Lista modelos de um provider especifico, mantendo o default primeiro.
 */
export function getModelsByProvider(
	provider: SupportedModelProvider,
): SupportedModel[] {
	const matches = SUPPORTED_MODELS.filter((m) => m.provider === provider);
	return matches.sort((a, b) => {
		if (a.isDefault && !b.isDefault) return -1;
		if (!a.isDefault && b.isDefault) return 1;
		return 0;
	});
}

/**
 * Deriva o provider a partir do ID do modelo.
 * Cai em "openai" como fallback seguro.
 */
export function getProviderFromModel(id: string): SupportedModelProvider {
	return findModel(id)?.provider ?? "openai";
}

/**
 * Retorna o primeiro modelo (preferindo o default) de um provider.
 * Util pra derivar `model` quando user troca de provider na UI.
 */
export function getDefaultModelForProvider(
	provider: SupportedModelProvider,
): SupportedModel {
	const list = getModelsByProvider(provider);
	if (list.length === 0) {
		throw new Error(`Nenhum modelo suportado para provider ${provider}`);
	}
	return list[0];
}
