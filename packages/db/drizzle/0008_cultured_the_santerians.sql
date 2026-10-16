ALTER TABLE "userPreferences" ADD COLUMN "settings" jsonb;--> statement-breakpoint
UPDATE "widgetGroup" g
SET "name" = sub."title"
FROM (
  SELECT DISTINCT ON ("groupId") "groupId", "title"
  FROM "widget"
  ORDER BY "groupId", "position" ASC
) sub
WHERE g."id" = sub."groupId";--> statement-breakpoint
UPDATE "widgetGroup" g
SET "settings" = sub."settings"
FROM (
  SELECT DISTINCT ON ("groupId") "groupId", "settings"
  FROM "widget"
  WHERE "settings" IS NOT NULL
  ORDER BY "groupId", "position" ASC
) sub
WHERE g."id" = sub."groupId" AND g."settings" IS NULL;--> statement-breakpoint
ALTER TABLE "widget" DROP COLUMN IF EXISTS "title";--> statement-breakpoint
ALTER TABLE "widget" DROP COLUMN IF EXISTS "settings";--> statement-breakpoint
ALTER TABLE "widget" DROP COLUMN IF EXISTS "shareSettings";
