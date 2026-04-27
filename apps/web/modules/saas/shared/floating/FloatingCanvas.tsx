/**
 * Canvas infinito com dot grid radial — fundo das rotas full-bleed
 * do setor comercial (Chat floating, Editor de agente, Construtor TIME,
 * outras vistas que adotarem padrão floating).
 *
 * Reusa o componente já existente em ai-studio sob alias canônico.
 * Quando algum bloco precisar variação (ex: dot grid mais denso, fundo
 * sem radial), criar variant aqui em vez de duplicar o componente base.
 */
export { StudioCanvas as FloatingCanvas } from "@saas/ai-studio/components/StudioCanvas";
