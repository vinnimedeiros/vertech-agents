/**
 * Registry dos 7 templates de vertical do Arquiteto (story 09.5).
 *
 * Consumido por `buildArchitectInstructions(context)` pra injetar o
 * `promptInjection` específico do vertical no system prompt.
 *
 * Convenção: `ArchitectTemplateId` aqui deve sincronizar com o enum do
 * `architectWorkingMemorySchema.templateId`.
 */
import { CLINICAL_TEMPLATE } from "./clinical";
import { CUSTOM_TEMPLATE } from "./custom";
import { ECOMMERCE_TEMPLATE } from "./ecommerce";
import { INFO_PRODUCT_TEMPLATE } from "./info-product";
import { LOCAL_SERVICES_TEMPLATE } from "./local-services";
import { REAL_ESTATE_TEMPLATE } from "./real-estate";
import { SAAS_TEMPLATE } from "./saas";
import type { ArchitectTemplate, ArchitectTemplateId } from "./types";

export type { ArchitectTemplate, ArchitectTemplateId };

export const ARCHITECT_TEMPLATE_REGISTRY: Record<
	ArchitectTemplateId,
	ArchitectTemplate
> = {
	clinical: CLINICAL_TEMPLATE,
	ecommerce: ECOMMERCE_TEMPLATE,
	real_estate: REAL_ESTATE_TEMPLATE,
	info_product: INFO_PRODUCT_TEMPLATE,
	saas: SAAS_TEMPLATE,
	local_services: LOCAL_SERVICES_TEMPLATE,
	custom: CUSTOM_TEMPLATE,
};

export function getArchitectTemplate(
	id: ArchitectTemplateId | string,
): ArchitectTemplate {
	const template =
		ARCHITECT_TEMPLATE_REGISTRY[id as ArchitectTemplateId] ??
		CUSTOM_TEMPLATE;
	return template;
}
