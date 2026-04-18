CREATE TYPE "public"."Channel" AS ENUM('WHATSAPP', 'EMAIL', 'SMS', 'WEBCHAT', 'INTERNAL');--> statement-breakpoint
CREATE TYPE "public"."ConversationStatus" AS ENUM('NEW', 'ACTIVE', 'WAITING', 'RESOLVED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."MessageDirection" AS ENUM('INBOUND', 'OUTBOUND');--> statement-breakpoint
CREATE TYPE "public"."MessageStatus" AS ENUM('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."MessageType" AS ENUM('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT', 'TEMPLATE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."SenderType" AS ENUM('CONTACT', 'USER', 'AGENT', 'SYSTEM');--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"contactId" varchar(255) NOT NULL,
	"channel" "Channel" DEFAULT 'INTERNAL' NOT NULL,
	"channelInstanceId" text,
	"status" "ConversationStatus" DEFAULT 'NEW' NOT NULL,
	"assignedAgentId" text,
	"isAIEnabled" boolean DEFAULT false NOT NULL,
	"assignedUserId" text,
	"lastMessageAt" timestamp,
	"lastMessagePreview" text,
	"unreadCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"conversationId" varchar(255) NOT NULL,
	"externalId" text,
	"externalTimestamp" timestamp,
	"senderType" "SenderType" NOT NULL,
	"senderId" text,
	"senderName" text,
	"senderAvatar" text,
	"direction" "MessageDirection" NOT NULL,
	"type" "MessageType" DEFAULT 'TEXT' NOT NULL,
	"status" "MessageStatus" DEFAULT 'PENDING' NOT NULL,
	"text" text,
	"mediaUrl" text,
	"mediaMimeType" text,
	"mediaFileName" text,
	"mediaSize" integer,
	"durationSeconds" integer,
	"caption" text,
	"replyToMessageId" varchar(255),
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_externalId_unique" UNIQUE("externalId")
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_contactId_contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_assignedUserId_user_id_fk" FOREIGN KEY ("assignedUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_org_status_idx" ON "conversation" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "conversation_contact_idx" ON "conversation" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "conversation_last_message_idx" ON "conversation" USING btree ("lastMessageAt");--> statement-breakpoint
CREATE INDEX "message_conversation_created_idx" ON "message" USING btree ("conversationId","createdAt");--> statement-breakpoint
CREATE INDEX "message_external_idx" ON "message" USING btree ("externalId");