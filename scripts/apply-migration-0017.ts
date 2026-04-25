/**
 * Aplica migration 0017 (agenda schema) via SQL direto.
 * Drizzle migrate está dessincronizado porque migrations anteriores foram
 * aplicadas via MCP Supabase fora do tracker.
 *
 * Idempotente: usa IF NOT EXISTS e TRY/CATCH em operações destrutivas.
 */
import { db, sql } from "@repo/database";

async function runQuiet(label: string, query: ReturnType<typeof sql>) {
	try {
		await db.execute(query);
		console.log(`[migrate] OK ${label}`);
	} catch (err) {
		const e = err as { code?: string; message?: string };
		if (e.code === "42710" || e.code === "42P07" || e.code === "42P01") {
			console.log(`[migrate] SKIP ${label} (already exists)`);
		} else {
			console.error(`[migrate] FAIL ${label}`, e.code, e.message);
			throw err;
		}
	}
}

async function main() {
	console.log("[migrate] Applying 0017 agenda schema");

	await runQuiet(
		"enum CalendarEventType",
		sql`CREATE TYPE "public"."CalendarEventType" AS ENUM('meeting', 'event', 'personal', 'task', 'reminder')`,
	);
	await runQuiet(
		"enum CalendarType",
		sql`CREATE TYPE "public"."CalendarType" AS ENUM('personal', 'work', 'shared')`,
	);

	await runQuiet(
		"table calendar",
		sql`
			CREATE TABLE "calendar" (
				"id" varchar(255) PRIMARY KEY NOT NULL,
				"organizationId" text NOT NULL,
				"name" text NOT NULL,
				"color" varchar(64) DEFAULT 'bg-blue-500' NOT NULL,
				"type" "CalendarType" DEFAULT 'personal' NOT NULL,
				"visible" boolean DEFAULT true NOT NULL,
				"isDefault" boolean DEFAULT false NOT NULL,
				"position" integer DEFAULT 0 NOT NULL,
				"createdBy" text,
				"createdAt" timestamp DEFAULT now() NOT NULL,
				"updatedAt" timestamp DEFAULT now() NOT NULL
			)
		`,
	);

	await runQuiet(
		"table calendar_event",
		sql`
			CREATE TABLE "calendar_event" (
				"id" varchar(255) PRIMARY KEY NOT NULL,
				"organizationId" text NOT NULL,
				"calendarId" text NOT NULL,
				"title" text NOT NULL,
				"description" text,
				"startAt" timestamp NOT NULL,
				"duration" varchar(64) DEFAULT '1 hora' NOT NULL,
				"allDay" boolean DEFAULT false NOT NULL,
				"type" "CalendarEventType" DEFAULT 'meeting' NOT NULL,
				"color" varchar(64),
				"location" text,
				"attendees" jsonb DEFAULT '[]'::jsonb NOT NULL,
				"reminder" boolean DEFAULT true NOT NULL,
				"createdBy" text,
				"createdAt" timestamp DEFAULT now() NOT NULL,
				"updatedAt" timestamp DEFAULT now() NOT NULL
			)
		`,
	);

	await runQuiet(
		"fk calendar_org",
		sql`ALTER TABLE "calendar" ADD CONSTRAINT "calendar_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade`,
	);
	await runQuiet(
		"fk calendar_user",
		sql`ALTER TABLE "calendar" ADD CONSTRAINT "calendar_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null`,
	);
	await runQuiet(
		"fk event_org",
		sql`ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade`,
	);
	await runQuiet(
		"fk event_calendar",
		sql`ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_calendarId_calendar_id_fk" FOREIGN KEY ("calendarId") REFERENCES "public"."calendar"("id") ON DELETE cascade`,
	);
	await runQuiet(
		"fk event_user",
		sql`ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null`,
	);

	await runQuiet(
		"idx calendar_org",
		sql`CREATE INDEX "calendar_organization_idx" ON "calendar" USING btree ("organizationId")`,
	);
	await runQuiet(
		"idx calendar_org_default",
		sql`CREATE INDEX "calendar_org_default_idx" ON "calendar" USING btree ("organizationId","isDefault")`,
	);
	await runQuiet(
		"idx event_org_start",
		sql`CREATE INDEX "calendar_event_org_start_idx" ON "calendar_event" USING btree ("organizationId","startAt")`,
	);
	await runQuiet(
		"idx event_calendar",
		sql`CREATE INDEX "calendar_event_calendar_idx" ON "calendar_event" USING btree ("calendarId")`,
	);

	console.log("[migrate] Done");
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
