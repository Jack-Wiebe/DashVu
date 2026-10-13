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

export const calendarEventsInputSchema = z
  .object({
    timeMin: z.string().datetime().optional(),
    timeMax: z.string().datetime().optional(),
    maxResults: z.number().int().min(1).max(250).optional(),
  })
  .default({});

export type CalendarEventsInput = z.infer<typeof calendarEventsInputSchema>;
