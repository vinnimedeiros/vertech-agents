CREATE TYPE "public"."WhatsAppInstanceStatus" AS ENUM('PENDING', 'CONNECTING', 'CONNECTED', 'DISCONNECTED', 'LOGGED_OUT', 'ERROR');--> statement-breakpoint
CREATE TABLE "whatsapp_instance" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"phoneNumber" text,
	"status" "WhatsAppInstanceStatus" DEFAULT 'PENDING' NOT NULL,
	"authState" json,
	"lastConnectedAt" timestamp,
	"lastQRCode" text,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_instance" ADD CONSTRAINT "whatsapp_instance_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_instance_org_idx" ON "whatsapp_instance" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "whatsapp_instance_status_idx" ON "whatsapp_instance" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_org_phone_uniq" ON "contact" USING btree ("organizationId","phone") WHERE "contact"."phone" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_contact_channel_instance_uniq" ON "conversation" USING btree ("contactId","channel","channelInstanceId");