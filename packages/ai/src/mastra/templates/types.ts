/**
 * Tipos compartilhados dos 7 templates do Arquiteto (story 09.5).
 *
 * Cada template exporta `promptInjection` (texto em pt-BR) que é injetado
 * dentro do system prompt pelo `buildArchitectInstructions`.
 */

export type ArchitectTemplateId =
	| "clinical"
	| "ecommerce"
	| "real_estate"
	| "info_product"
	| "saas"
	| "local_services"
	| "custom";

export type ArchitectTemplate = {
	id: ArchitectTemplateId;
	label: string;
	industry: string;
	emoji: string;
	promptInjection: string;
};
