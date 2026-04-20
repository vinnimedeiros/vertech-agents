import { openai } from "@ai-sdk/openai";

export const textModel = openai("gpt-4o-mini");
export const imageModel = openai("dall-e-3");
export const audioModel = openai("whisper-1");

export * from "ai";
export * from "./lib";

// Phase 07A: Mastra subsystem (agente comercial dinamico + memory + storage)
export * from "./src/mastra";

// Phase 08-alpha: RAG infrastructure (ingest + chunk + embed + retrieval)
export * from "./src/rag";
