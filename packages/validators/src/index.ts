import { z } from "zod";

/**
 * @dashvu/validators - shared zod schemas for API/tRPC input validation.
 *
 * These will be shared between the server (tRPC routers) and client (forms)
 * so input rules live in exactly one place.
 */

export * from "./connector";
export * from "./planner";

export const widgetKindSchema = z.enum([
  "spotify",
  "gallery",
  "calendar",
  "weather",
  "funPack",
  "planner",
  "canvas",
]);

export type WidgetKind = z.infer<typeof widgetKindSchema>;

export const widgetSizeSchema = z.enum(["sm", "md", "lrg"]);

export type WidgetSize = z.infer<typeof widgetSizeSchema>;

export const widgetLayoutItemSchema = z.object({
  id: z.string().min(1),
  kind: widgetKindSchema,
  title: z.string().min(1),
  size: widgetSizeSchema,
  position: z.number().int().min(0),
  settings: z.record(z.unknown()).nullish(),
});

export type WidgetLayoutItem = z.infer<typeof widgetLayoutItemSchema>;

export const saveLayoutSchema = z.object({
  dashboardId: z.string().min(1),
  widgets: z.array(widgetLayoutItemSchema),
});

export type SaveLayoutInput = z.infer<typeof saveLayoutSchema>;

export const DEFAULT_WIDGET_LAYOUT: Array<
  Pick<WidgetLayoutItem, "kind" | "title" | "size" | "position">
> = [
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
