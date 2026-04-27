CREATE TYPE "public"."TeamKind" AS ENUM('COMMERCIAL');--> statement-breakpoint
CREATE TYPE "public"."TeamMemberRole" AS ENUM('SUPERVISOR', 'ANALYST', 'CAMPAIGNS', 'ASSISTANT');--> statement-breakpoint
CREATE TYPE "public"."TeamStatus" AS ENUM('DRAFT', 'ACTIVE', 'SANDBOX', 'PAUSED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "team" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" "TeamKind" DEFAULT 'COMMERCIAL' NOT NULL,
	"brandVoice" json DEFAULT '{}'::json NOT NULL,
	"status" "TeamStatus" DEFAULT 'DRAFT' NOT NULL,
	"whatsappInstanceId" text,
	"metrics" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"publishedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"teamId" text NOT NULL,
	"agentId" text NOT NULL,
	"role" "TeamMemberRole" NOT NULL,
	"delegateInstruction" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "teamId" text;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_teamId_team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_org_status_idx" ON "team" USING btree ("organizationId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "team_member_unique" ON "team_member" USING btree ("teamId","agentId");--> statement-breakpoint
CREATE UNIQUE INDEX "team_supervisor_unique" ON "team_member" USING btree ("teamId") WHERE role = 'SUPERVISOR';--> statement-breakpoint
CREATE INDEX "team_member_team_idx" ON "team_member" USING btree ("teamId");--> statement-breakpoint
CREATE INDEX "agent_team_idx" ON "agent" USING btree ("teamId");--> statement-breakpoint

-- Phase 11 backfill: pra cada organization que tem agents, cria TIME default
-- "TIME Comercial Vertech" e vincula primeiro agent como SUPERVISOR.
-- Demais agents da org viram membros SUPERVISOR de TIMES próprios (legacy
-- single-agent vira TIME solo). Multi-agent flow real só após onboarding V3.
DO $$
DECLARE
  org RECORD;
  agt RECORD;
  new_team_id TEXT;
  is_first BOOLEAN;
BEGIN
  FOR org IN SELECT DISTINCT "organizationId" FROM agent LOOP
    is_first := TRUE;
    FOR agt IN
      SELECT id, name FROM agent
      WHERE "organizationId" = org."organizationId"
      ORDER BY "createdAt" ASC
    LOOP
      IF is_first THEN
        -- Cria TIME pra este org com o primeiro agent como SUPERVISOR
        new_team_id := 'tm_' || substr(md5(random()::text), 1, 24);
        INSERT INTO team (id, "organizationId", name, kind, status, "brandVoice", "createdAt", "updatedAt")
        VALUES (
          new_team_id,
          org."organizationId",
          'TIME Comercial',
          'COMMERCIAL',
          'DRAFT',
          '{}'::json,
          NOW(),
          NOW()
        );
        INSERT INTO team_member (id, "teamId", "agentId", role, "delegateInstruction", bio, position, "createdAt", "updatedAt")
        VALUES (
          'tmm_' || substr(md5(random()::text), 1, 24),
          new_team_id,
          agt.id,
          'SUPERVISOR',
          '',
          'Atendente principal do TIME',
          0,
          NOW(),
          NOW()
        );
        UPDATE agent SET "teamId" = new_team_id WHERE id = agt.id;
        is_first := FALSE;
      ELSE
        -- Agents extras da mesma org: criam TIME próprio (caso edge — provavel zero em prod V3)
        new_team_id := 'tm_' || substr(md5(random()::text), 1, 24);
        INSERT INTO team (id, "organizationId", name, kind, status, "brandVoice", "createdAt", "updatedAt")
        VALUES (
          new_team_id,
          org."organizationId",
          'TIME Comercial — ' || agt.name,
          'COMMERCIAL',
          'DRAFT',
          '{}'::json,
          NOW(),
          NOW()
        );
        INSERT INTO team_member (id, "teamId", "agentId", role, "delegateInstruction", bio, position, "createdAt", "updatedAt")
        VALUES (
          'tmm_' || substr(md5(random()::text), 1, 24),
          new_team_id,
          agt.id,
          'SUPERVISOR',
          '',
          'Atendente principal do TIME',
          0,
          NOW(),
          NOW()
        );
        UPDATE agent SET "teamId" = new_team_id WHERE id = agt.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;