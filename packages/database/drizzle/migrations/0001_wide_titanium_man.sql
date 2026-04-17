CREATE TYPE "public"."OrganizationType" AS ENUM('SUPERADMIN', 'MASTER', 'AGENCY', 'CLIENT');--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "organizationType" "OrganizationType" DEFAULT 'CLIENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "parentOrganizationId" varchar(255);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "branding" json DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "features" json DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "billing" json DEFAULT '{}'::json;--> statement-breakpoint
CREATE INDEX "organization_parent_idx" ON "organization" USING btree ("parentOrganizationId");--> statement-breakpoint
CREATE INDEX "organization_type_idx" ON "organization" USING btree ("organizationType");--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_parent_fk" FOREIGN KEY ("parentOrganizationId") REFERENCES "public"."organization"("id") ON DELETE RESTRICT ON UPDATE no action;