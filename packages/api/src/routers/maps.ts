import {
  geocodeInputSchema,
  optimizeInputSchema,
  reverseGeocodeInputSchema,
  routeInputSchema,
} from "@dashvu/validators";

import { getConnector } from "../connectors/registry";
import { protectedProcedure, router } from "../trpc";

/** Routing engine for driving/cycling/walking. Swap for `"valhalla"` to switch. */
const ROUTING_ENGINE: "osrm" | "valhalla" = "osrm";

export const mapsRouter = router({
  geocode: protectedProcedure.input(geocodeInputSchema).query(({ ctx, input }) =>
    getConnector("photon").invoke(ctx.session.user.id, {
      action: "search",
      query: input.query,
      limit: 6,
      lat: input.lat,
      lon: input.lon,
    })
  ),

  reverse: protectedProcedure.input(reverseGeocodeInputSchema).query(({ ctx, input }) =>
    getConnector("photon").invoke(ctx.session.user.id, {
      action: "reverse",
      lat: input.lat,
      lon: input.lon,
    })
  ),

  route: protectedProcedure.input(routeInputSchema).query(async ({ ctx, input }) => {
    if (input.mode === "transit") {
      const itineraries = await getConnector("transitous").invoke(ctx.session.user.id, {
        from: input.origin,
        to: input.stops[input.stops.length - 1],
      });
      return { mode: "transit" as const, itineraries };
    }

    const result = await getConnector(ROUTING_ENGINE).invoke(ctx.session.user.id, {
      action: "route",
      mode: input.mode,
      points: [input.origin, ...input.stops],
    });

    return {
      mode: input.mode,
      distanceMeters: result.distanceMeters,
      durationSeconds: result.durationSeconds,
      geometry: result.geometry,
      legs: result.legs,
    };
  }),

  optimize: protectedProcedure.input(optimizeInputSchema).query(async ({ ctx, input }) => {
    if (input.mode === "transit") {
      return { order: input.stops.map((_, index) => index), route: null };
    }

    const result = await getConnector(ROUTING_ENGINE).invoke(ctx.session.user.id, {
      action: "optimize",
      mode: input.mode,
      points: [input.origin, ...input.stops],
    });

    const pointsOrder = result.order ?? [];
    const order = pointsOrder.length
      ? pointsOrder.filter((index) => index !== 0).map((index) => index - 1)
      : input.stops.map((_, index) => index);

    return {
      order,
      route: {
        mode: input.mode,
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
        geometry: result.geometry,
        legs: result.legs,
      },
    };
  }),
});
