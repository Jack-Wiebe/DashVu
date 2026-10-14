ALTER TABLE "widgetItem" DROP CONSTRAINT "widgetItem_widgetId_widget_id_fk";
--> statement-breakpoint
ALTER TABLE "widgetItem" DROP COLUMN IF EXISTS "widgetId";