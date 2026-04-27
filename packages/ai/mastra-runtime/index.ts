/**
 * Entrypoint dedicado pro Mastra CLI (`mastra dev` + `mastra studio`).
 *
 * Não use em runtime de produção — pra isso use `getMastra()` lazy de
 * `src/mastra/instance.ts`. Esse arquivo serve só pro Studio descobrir
 * agentes/tools/storage durante desenvolvimento local.
 *
 * Uso:
 *   cd packages/ai
 *   pnpm exec mastra dev --root . --dir mastra-runtime --env ../../.env.local
 *   pnpm exec mastra studio
 */
import { getMastra } from "../src/mastra/instance";

export const mastra = getMastra();
