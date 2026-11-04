import { z } from "zod";

/**
 * Shared zod schemas for the `calendar` widget: event queries and the
 * widget's per-instance settings.
 */

export const calendarEventsInputSchema = z
  .object({
    timeMin: z.string().datetime().optional(),
    timeMax: z.string().datetime().optional(),
    /** Client-local calendar dates (YYYY-MM-DD) for range filtering. */
    timeMinDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    timeMaxDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    /** Client-local today (YYYY-MM-DD) for undated tasks. */
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    maxResults: z.number().int().min(1).max(250).optional(),
    /** Calendar ids to skip (per-instance filter); all others are fetched. */
    excludeCalendarIds: z.array(z.string().min(1)).max(200).optional(),
  })
  .default({});

export type CalendarEventsInput = z.infer<typeof calendarEventsInputSchema>;

export const calendarSettingsSchema = z.object({
  /** Calendars the user has hidden for this widget instance. */
  hiddenCalendarIds: z.array(z.string().min(1)).max(200).default([]),
});

export type CalendarSettings = z.infer<typeof calendarSettingsSchema>;
