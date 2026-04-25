export * from "./client";
export * from "./zod";
export * from "./queries";
export * from "./schema";

// Re-export commonly used Drizzle helpers so consumers don't need to install drizzle-orm directly
export {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	like,
	lt,
	lte,
	ne,
	notInArray,
	or,
	sql,
} from "drizzle-orm";

// Re-export cuid2 id factory pra consumers fora do package não precisarem instalar
// @paralleldrive/cuid2 separado. Usado em endpoints que geram IDs antes do insert
// (ex: upload endpoint 08A.4 precisa do documentId pra construir storage path).
export { createId } from "@paralleldrive/cuid2";
