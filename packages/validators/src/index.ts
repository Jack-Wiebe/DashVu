import { z } from "zod";

/**
 * @dashvu/validators - shared zod schemas for API/tRPC input validation.
 *
 * These will be shared between the server (tRPC routers) and client (forms)
 * so input rules live in exactly one place.
 */

export const widgetKindSchema = z.enum(["spotify", "gallery", "calendar"]);

export type WidgetKind = z.infer<typeof widgetKindSchema>;

export const widgetConfigSchema = z.object({
  id: z.string(),
  kind: widgetKindSchema,
  title: z.string().min(1),
});

export type WidgetConfigInput = z.infer<typeof widgetConfigSchema>;
