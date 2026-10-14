CREATE TABLE IF NOT EXISTS "widgetGroup" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"settings" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "widget" ADD COLUMN "groupId" text;--> statement-breakpoint
ALTER TABLE "widget" ADD COLUMN "shareSettings" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "widgetItem" ADD COLUMN "groupId" text;--> statement-breakpoint
INSERT INTO "widgetGroup" ("id", "userId", "kind", "name", "isDefault")
SELECT gen_random_uuid()::text, "source"."userId", "source"."kind", "source"."kind", true
FROM (
	SELECT DISTINCT "d"."userId", "w"."kind"
	FROM "widget" "w"
	JOIN "dashboard" "d" ON "d"."id" = "w"."dashboardId"
) AS "source";--> statement-breakpoint
UPDATE "widget" "w"
SET "groupId" = "g"."id"
FROM "dashboard" "d", "widgetGroup" "g"
WHERE "d"."id" = "w"."dashboardId"
	AND "g"."userId" = "d"."userId"
	AND "g"."kind" = "w"."kind"
	AND "g"."isDefault";--> statement-breakpoint
UPDATE "widgetItem" "i"
SET "groupId" = "w"."groupId"
FROM "widget" "w"
WHERE "i"."widgetId" = "w"."id";--> statement-breakpoint
ALTER TABLE "widget" ALTER COLUMN "groupId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "widgetItem" ALTER COLUMN "groupId" SET NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "widgetItem_widgetId_mode_idx";--> statement-breakpoint
ALTER TABLE "widgetItem" ALTER COLUMN "widgetId" DROP NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "widgetGroup" ADD CONSTRAINT "widgetGroup_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "widgetGroup_default_idx" ON "widgetGroup" USING btree ("userId","kind") WHERE "widgetGroup"."isDefault";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "widgetGroup_userId_idx" ON "widgetGroup" USING btree ("userId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "widgetItem" ADD CONSTRAINT "widgetItem_groupId_widgetGroup_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."widgetGroup"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "widget" ADD CONSTRAINT "widget_groupId_widgetGroup_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."widgetGroup"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "widgetItem_groupId_mode_idx" ON "widgetItem" USING btree ("groupId","mode");
