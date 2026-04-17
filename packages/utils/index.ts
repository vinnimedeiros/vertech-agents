export * from "./lib/base-url";
// Server-only utilities are NOT re-exported here to prevent
// accidental client-side imports of Node.js deps (pg, etc).
// Import them explicitly from subpaths:
//   import { hasFeature } from "@repo/utils/lib/features";
