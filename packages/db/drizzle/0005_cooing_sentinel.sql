ALTER TABLE "dashboard" DROP CONSTRAINT "dashboard_userId_unique";--> statement-breakpoint
ALTER TABLE "dashboard" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "userPreferences" ADD COLUMN "activeDashboardId" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userPreferences" ADD CONSTRAINT "userPreferences_activeDashboardId_dashboard_id_fk" FOREIGN KEY ("activeDashboardId") REFERENCES "public"."dashboard"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
