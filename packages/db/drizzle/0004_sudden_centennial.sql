CREATE TABLE IF NOT EXISTS "widgetItem" (
	"id" text PRIMARY KEY NOT NULL,
	"widgetId" text NOT NULL,
	"mode" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"text" text NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"date" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "widgetItem" ADD CONSTRAINT "widgetItem_widgetId_widget_id_fk" FOREIGN KEY ("widgetId") REFERENCES "public"."widget"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "widgetItem_widgetId_mode_idx" ON "widgetItem" USING btree ("widgetId","mode");