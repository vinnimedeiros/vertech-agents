ALTER TABLE "contact" ADD COLUMN "isBusiness" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "businessCategory" text;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "businessHours" text;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "businessWebsite" text;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "businessDescription" text;