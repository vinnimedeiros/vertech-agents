import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
	index,
	json,
	pgEnum,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { organization } from "./postgres";

// ============================================================
// Enums
// ============================================================

export const whatsappInstanceStatusEnum = pgEnum("WhatsAppInstanceStatus", [
	"PENDING", // criada, ainda sem conectar
	"CONNECTING", // QR gerado, aguardando leitura
	"CONNECTED", // online, recebendo
	"DISCONNECTED", // caiu, vai tentar reconectar
	"LOGGED_OUT", // logout manual/expirada → precisa QR novo
	"ERROR", // erro fatal
]);

// ============================================================
// Tabelas
// ============================================================

export const whatsappInstance = pgTable(
	"whatsapp_instance",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),

		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),

		name: text("name").notNull(), // "Número principal"
		phoneNumber: text("phoneNumber"), // preenchido após conectar
		status: whatsappInstanceStatusEnum("status")
			.notNull()
			.default("PENDING"),

		// Baileys auth state (creds + signal keys) — sensível, nunca expor via API pública
		authState: json("authState"),

		// Runtime metadata
		lastConnectedAt: timestamp("lastConnectedAt"),
		lastQRCode: text("lastQRCode"),
		lastError: text("lastError"),

		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("whatsapp_instance_org_idx").on(table.organizationId),
		index("whatsapp_instance_status_idx").on(table.status),
	],
);

export const whatsappInstanceRelations = relations(
	whatsappInstance,
	({ one }) => ({
		organization: one(organization, {
			fields: [whatsappInstance.organizationId],
			references: [organization.id],
		}),
	}),
);
