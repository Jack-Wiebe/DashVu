import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { nearestNeighborOrder, type GeoPoint, type RouteResult } from "@dashvu/core";
import { db, savedLocations, userPreferences } from "@dashvu/db";
import {
  geocodeInputSchema,
  mapUserStateSchema,
  mapUserStateUpdateSchema,
  optimizeInputSchema,
  reverseGeocodeInputSchema,
  routeInputSchema,
  savedLocationInputSchema,
  savedLocationRemoveSchema,
  savedLocationRenameSchema,
  savedLocationsImportSchema,
} from "@dashvu/validators";

import { getConnector } from "../connectors/registry";
import { protectedProcedure, router } from "../trpc";

/** Routing engine for driving/cycling/walking. Swap for `"valhalla"` to switch. */
const ROUTING_ENGINE: "osrm" | "valhalla" = "osrm";

type OptimizedRoute = Pick<
  RouteResult,
  "mode" | "distanceMeters" | "durationSeconds" | "geometry" | "legs"
>;

function isValidOrder(order: number[], count: number): boolean {
  if (order.length !== count) return false;
  const seen = new Set<number>();
  for (const index of order) {
    if (!Number.isInteger(index) || index < 0 || index >= count || seen.has(index)) return false;
    seen.add(index);
  }
  return order[0] === 0 && order[count - 1] === count - 1;
}

async function optimizeSegment(
  userId: string,
  mode: "driving" | "cycling" | "walking" | "transit",
  points: GeoPoint[]
): Promise<{ order: number[]; route: OptimizedRoute | null }> {
  if (mode === "transit" || points.length <= 2) {
    return { order: points.map((_, index) => index), route: null };
  }

  try {
    const result = await getConnector(ROUTING_ENGINE).invoke(userId, {
      action: "optimize",
      mode,
      points,
    });
    if (result.order && isValidOrder(result.order, points.length)) {
      return {
        order: result.order,
        route: {
          mode,
          distanceMeters: result.distanceMeters,
          durationSeconds: result.durationSeconds,
          geometry: result.geometry,
          legs: result.legs,
        },
      };
    }
  } catch {
    /* fall through to the local nearest-neighbour order */
  }

  return { order: nearestNeighborOrder(points), route: null };
}

async function readMapState(userId: string) {
  const [preferences] = await db
    .select({ settings: userPreferences.settings })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  const settings = (preferences?.settings ?? {}) as Record<string, unknown>;
  const parsed = mapUserStateSchema.safeParse(settings.map);
  return parsed.success ? parsed.data : {};
}

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
    const points = [input.origin, ...input.stops];
    const pinned = new Set(
      (input.pinnedIndices ?? []).filter((index) => index < input.stops.length)
    );
    const anchors = Array.from(
      new Set([0, ...[...pinned].map((index) => index + 1), points.length - 1])
    )
      .filter((index) => index >= 0 && index < points.length)
      .sort((a, b) => a - b);

    const segments: Array<[number, number]> = [];
    for (let index = 0; index < anchors.length - 1; index += 1) {
      segments.push([anchors[index], anchors[index + 1]]);
    }

    const order: number[] = [];
    let route: OptimizedRoute | null = null;

    for (const [start, end] of segments) {
      const segmentPoints = points.slice(start, end + 1);
      const optimized = await optimizeSegment(ctx.session.user.id, input.mode, segmentPoints);
      if (segments.length === 1) route = optimized.route;
      const globalOrder = optimized.order.map((index) => start + index);
      if (order.length === 0) order.push(...globalOrder);
      else order.push(...globalOrder.slice(1));
    }

    return {
      order: order.filter((index) => index !== 0).map((index) => index - 1),
      route,
    };
  }),

  listSavedLocations: protectedProcedure.query(async ({ ctx }) =>
    db
      .select()
      .from(savedLocations)
      .where(eq(savedLocations.userId, ctx.session.user.id))
      .orderBy(desc(savedLocations.createdAt))
  ),

  createSavedLocation: protectedProcedure
    .input(savedLocationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [location] = await db
        .insert(savedLocations)
        .values({
          userId: ctx.session.user.id,
          label: input.label,
          lat: input.lat,
          lon: input.lon,
        })
        .returning();
      return location;
    }),

  importSavedLocations: protectedProcedure
    .input(savedLocationsImportSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await db
        .select()
        .from(savedLocations)
        .where(eq(savedLocations.userId, userId));
      const seen = new Set(
        existing.map((location) => `${location.lat.toFixed(6)},${location.lon.toFixed(6)}`)
      );
      const pending = input.locations.filter((location) => {
        const key = `${location.lat.toFixed(6)},${location.lon.toFixed(6)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      for (const location of pending) {
        await db.insert(savedLocations).values({
          userId,
          label: location.label,
          lat: location.lat,
          lon: location.lon,
        });
      }

      return { imported: pending.length };
    }),

  renameSavedLocation: protectedProcedure
    .input(savedLocationRenameSchema)
    .mutation(async ({ ctx, input }) => {
      const [location] = await db
        .update(savedLocations)
        .set({ label: input.label })
        .where(and(eq(savedLocations.id, input.id), eq(savedLocations.userId, ctx.session.user.id)))
        .returning();
      if (!location) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Saved location not found" });
      }
      return location;
    }),

  removeSavedLocation: protectedProcedure
    .input(savedLocationRemoveSchema)
    .mutation(async ({ ctx, input }) => {
      const [location] = await db
        .delete(savedLocations)
        .where(and(eq(savedLocations.id, input.id), eq(savedLocations.userId, ctx.session.user.id)))
        .returning({ id: savedLocations.id });
      if (!location) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Saved location not found" });
      }
      return { ok: true } as const;
    }),

  getUserState: protectedProcedure.query(({ ctx }) => readMapState(ctx.session.user.id)),

  updateUserState: protectedProcedure
    .input(mapUserStateUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const patch = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined)
      );
      const state = { ...(await readMapState(userId)), ...patch };

      const [preferences] = await db
        .select({ settings: userPreferences.settings })
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);
      const settings = {
        ...((preferences?.settings ?? {}) as Record<string, unknown>),
        map: state,
      };

      await db
        .insert(userPreferences)
        .values({ userId, settings })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { settings, updatedAt: new Date() },
        });

      return state;
    }),
});
