import { z } from "zod";

/**
 * @dashvu/validators - shared zod schemas for API/tRPC input validation.
 *
 * These will be shared between the server (tRPC routers) and client (forms)
 * so input rules live in exactly one place.
 */

export * from "./connector";
export * from "./planner";
export * from "./news";
export * from "./discover";
export * from "./dictionary";
export * from "./dashboard";

export const widgetKindSchema = z.enum([
  "spotify",
  "gallery",
  "calendar",
  "weather",
  "funPack",
  "planner",
  "canvas",
  "news",
  "discover",
  "dictionary",
]);

export type WidgetKind = z.infer<typeof widgetKindSchema>;

export const widgetSizeSchema = z.enum(["sm", "md", "lrg"]);

export type WidgetSize = z.infer<typeof widgetSizeSchema>;

/**
 * A widget placement on a dashboard. Name/settings/content belong to the
 * instance (`groupId`); only layout (`size`, `position`) lives here.
 */
export const widgetLayoutItemSchema = z.object({
  id: z.string().min(1),
  kind: widgetKindSchema,
  size: widgetSizeSchema,
  position: z.number().int().min(0),
  groupId: z.string().min(1).optional(),
  /** Display name to give the default instance if it has to be created. */
  instanceName: z.string().trim().min(1).max(60).optional(),
});

export type WidgetLayoutItem = z.infer<typeof widgetLayoutItemSchema>;

export const saveLayoutSchema = z.object({
  dashboardId: z.string().min(1),
  widgets: z.array(widgetLayoutItemSchema),
});

export type SaveLayoutInput = z.infer<typeof saveLayoutSchema>;

export const instanceNameSchema = z.string().trim().min(1).max(60);

export const widgetInstanceListSchema = z.object({
  kind: widgetKindSchema,
});

export const widgetInstanceCreateSchema = z.object({
  kind: widgetKindSchema,
  name: instanceNameSchema.optional(),
});

export const widgetInstanceUpdateSchema = z.object({
  groupId: z.string().min(1),
  name: instanceNameSchema.optional(),
  settings: z.record(z.unknown()).nullish(),
});

export type WidgetInstanceListInput = z.infer<typeof widgetInstanceListSchema>;
export type WidgetInstanceCreateInput = z.infer<typeof widgetInstanceCreateSchema>;
export type WidgetInstanceUpdateInput = z.infer<typeof widgetInstanceUpdateSchema>;

export const themeIdSchema = z.string().trim().min(1).max(40);

export const userPreferencesUpdateSchema = z.object({
  theme: themeIdSchema.optional(),
  settings: z.record(z.unknown()).nullish(),
});

export type UserPreferencesUpdateInput = z.infer<typeof userPreferencesUpdateSchema>;

export const DEFAULT_WIDGET_LAYOUT: Array<{
  kind: WidgetKind;
  title: string;
  size: WidgetSize;
  position: number;
}> = [
  { kind: "spotify", title: "Now Playing", size: "sm", position: 0 },
  { kind: "gallery", title: "Gallery", size: "sm", position: 1 },
  { kind: "calendar", title: "Calendar", size: "md", position: 2 },
];

export const calendarEventsInputSchema = z
  .object({
    timeMin: z.string().datetime().optional(),
    timeMax: z.string().datetime().optional(),
    maxResults: z.number().int().min(1).max(250).optional(),
  })
  .default({});

export type CalendarEventsInput = z.infer<typeof calendarEventsInputSchema>;

export const weatherCurrentInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type WeatherCurrentInput = z.infer<typeof weatherCurrentInputSchema>;

export const weatherSearchInputSchema = z.object({
  query: z.string().min(1).max(120),
});

export type WeatherSearchInput = z.infer<typeof weatherSearchInputSchema>;
