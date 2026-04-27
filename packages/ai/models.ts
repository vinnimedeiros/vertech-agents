/**
 * Subpath pra importar o catalogo de modelos sem puxar dependencias server-only
 * (Mastra / pg / etc). Consumir via `@repo/ai/models` — seguro pra uso em
 * client components.
 */
export * from "./src/mastra/models";
