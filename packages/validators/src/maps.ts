import { z } from "zod";

/**
 * Shared zod schemas for the `map` (route planner) widget: travel modes, map
 * locations, and the widget's per-instance settings.
 */

export const travelModeSchema = z.enum(["driving", "cycling", "walking", "transit"]);

export type TravelMode = z.infer<typeof travelModeSchema>;

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export type GeoPointInput = z.infer<typeof geoPointSchema>;

export const geoPlaceSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().trim().min(1).max(200),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  kind: z.string().max(40).nullish(),
});

export type GeoPlaceInput = z.infer<typeof geoPlaceSchema>;

export const MAX_MAP_STOPS = 25;

export const geocodeInputSchema = z.object({
  query: z.string().trim().min(2).max(120),
  /** Optional viewport bias (result ranking), e.g. the current map center. */
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

export const reverseGeocodeInputSchema = geoPointSchema;

export const routeInputSchema = z.object({
  mode: travelModeSchema,
  origin: geoPointSchema,
  stops: z.array(geoPointSchema).min(1).max(MAX_MAP_STOPS),
});

export type RouteInput = z.infer<typeof routeInputSchema>;

export const optimizeInputSchema = routeInputSchema;

export type OptimizeInput = z.infer<typeof optimizeInputSchema>;

export const mapSettingsSchema = z.object({
  mode: travelModeSchema.optional(),
  /**
   * Ordered route points; index 0 is the origin ("start"), the rest are stops.
   * Legacy settings stored `origin` + `stops` separately and are migrated on load.
   */
  points: z
    .array(geoPlaceSchema)
    .max(MAX_MAP_STOPS + 1)
    .optional(),
  favourites: z.array(geoPlaceSchema).max(50).optional(),
});

export type MapSettings = z.infer<typeof mapSettingsSchema>;
