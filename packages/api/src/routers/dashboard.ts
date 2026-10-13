import { TRPCError } from "@trpc/server";
import { and, eq, notInArray, sql } from "drizzle-orm";

import { dashboards, db, widgets } from "@dashvu/db";
import {
  DEFAULT_WIDGET_LAYOUT,
  saveLayoutSchema,
  type WidgetKind,
  type WidgetSize,
} from "@dashvu/validators";

import { protectedProcedure, router } from "../trpc";

async function getOrCreateDashboard(userId: string) {
  const [existing] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(dashboards)
    .values({ userId })
    .onConflictDoNothing({ target: dashboards.userId })
    .returning();

  if (created) {
    await db.insert(widgets).values(
      DEFAULT_WIDGET_LAYOUT.map((item) => ({
        dashboardId: created.id,
        kind: item.kind,
        title: item.title,
        size: item.size,
        position: item.position,
      }))
    );
    return created;
  }

  const [raced] = await db.select().from(dashboards).where(eq(dashboards.userId, userId)).limit(1);

  return raced;
}

export const dashboardRouter = router({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const dashboard = await getOrCreateDashboard(ctx.session.user.id);

    const rows = await db
      .select()
      .from(widgets)
      .where(eq(widgets.dashboardId, dashboard.id))
      .orderBy(widgets.position);

    return {
      id: dashboard.id,
      name: dashboard.name,
      widgets: rows.map((widget) => ({
        id: widget.id,
        kind: widget.kind as WidgetKind,
        title: widget.title,
        size: (widget.size === "wide" ? "lrg" : widget.size) as WidgetSize,
        position: widget.position,
        settings: widget.settings ?? null,
      })),
    };
  }),

  saveLayout: protectedProcedure.input(saveLayoutSchema).mutation(async ({ ctx, input }) => {
    const [dashboard] = await db
      .select({ id: dashboards.id })
      .from(dashboards)
      .where(and(eq(dashboards.id, input.dashboardId), eq(dashboards.userId, ctx.session.user.id)))
      .limit(1);

    if (!dashboard) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
    }

    const incomingIds = input.widgets.map((widget) => widget.id);

    if (incomingIds.length > 0) {
      await db
        .delete(widgets)
        .where(and(eq(widgets.dashboardId, dashboard.id), notInArray(widgets.id, incomingIds)));
    } else {
      await db.delete(widgets).where(eq(widgets.dashboardId, dashboard.id));
    }

    if (input.widgets.length > 0) {
      await db
        .insert(widgets)
        .values(
          input.widgets.map((widget) => ({
            id: widget.id,
            dashboardId: dashboard.id,
            kind: widget.kind,
            title: widget.title,
            size: widget.size,
            position: widget.position,
            settings: widget.settings ?? null,
          }))
        )
        .onConflictDoUpdate({
          target: widgets.id,
          set: {
            kind: sql`excluded."kind"`,
            title: sql`excluded."title"`,
            size: sql`excluded."size"`,
            position: sql`excluded."position"`,
            settings: sql`excluded."settings"`,
          },
          where: sql`${widgets.dashboardId} = excluded."dashboardId"`,
        });
    }

    await db
      .update(dashboards)
      .set({ updatedAt: new Date() })
      .where(eq(dashboards.id, dashboard.id));

    return { ok: true } as const;
  }),
});
