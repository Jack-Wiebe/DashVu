UPDATE "widget" SET "size" = '1w1h' WHERE "size" = 'sm';
--> statement-breakpoint
UPDATE "widget" SET "size" = '2w1h' WHERE "size" IN ('md', 'wide');
--> statement-breakpoint
UPDATE "widget" SET "size" = '2w2h' WHERE "size" IN ('lrg', 'xl');
--> statement-breakpoint
UPDATE "widget" SET "size" = '1w1h' WHERE "size" !~ '^[1-3]w[1-6]h$';
