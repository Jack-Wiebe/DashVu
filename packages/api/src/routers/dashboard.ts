import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, notInArray, sql } from "drizzle-orm";

import { dashboards, db, userPreferences, widgetGroups, widgets } from "@dashvu/db";
import {
  dashboardCreateSchema,
  dashboardIdSchema,
  dashboardRenameSchema,
  dashboardReorderSchema,
  DEFAULT_WIDGET_LAYOUT,
  saveLayoutSchema,
  widgetInstanceCreateSchema,
  widgetInstanceListSchema,
  widgetInstanceUpdateSchema,
  type WidgetKind,
  type WidgetSize,
} from "@dashvu/validators";

import { resolveGroupForKind } from "../groups";
import { protectedProcedure, router } from "../trpc";

function toWidget(row: {
  id: string;
  kind: string;
  size: string;
  position: number;
  groupId: string;
  groupName: string;
  groupSettings: Record<string, unknown> | null;
}) {
  return {
    id: row.id,
    kind: row.kind as WidgetKind,
    title: row.groupName,
    size: (row.size === "wide" ? "lrg" : row.size) as WidgetSize,
    position: row.position,
    settings: row.groupSettings ?? null,
    groupId: row.groupId,
  };
}

async function listDashboards(userId: string) {
  return db
    .select({ id: dashboards.id, name: dashboards.name, position: dashboards.position })
    .from(dashboards)
    .where(eq(dashboards.userId, userId))
    .orderBy(asc(dashboards.position), asc(dashboards.createdAt));
}

async function getOwnedDashboard(userId: string, id: string) {
  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)))
    .limit(1);

  return dashboard ?? null;
}

async function getDashboardWidgets(dashboardId: string) {
  const rows = await db
    .select({
      id: widgets.id,
      kind: widgets.kind,
      size: widgets.size,
      position: widgets.position,
      groupId: widgets.groupId,
      groupName: widgetGroups.name,
      groupSettings: widgetGroups.settings,
    })
    .from(widgets)
    .innerJoin(widgetGroups, eq(widgets.groupId, widgetGroups.id))
    .where(eq(widgets.dashboardId, dashboardId))
    .orderBy(widgets.position);

  return rows.map(toWidget);
}

async function ensureDashboard(userId: string) {
  const [existing] = await listDashboards(userId);

  if (existing) {
    const [full] = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, existing.id))
      .limit(1);
    if (full) return full;
  } else {
    const [created] = await db.insert(dashboards).values({ userId, position: 0 }).returning();

    if (created) {
      const seeded = [];
      for (const item of DEFAULT_WIDGET_LAYOUT) {
        seeded.push({
          dashboardId: created.id,
          groupId: await resolveGroupForKind(userId, item.kind, item.title),
          kind: item.kind,
          size: item.size,
          position: item.position,
        });
      }
      await db.insert(widgets).values(seeded);
      return created;
    }
  }

  const [fallback] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.userId, userId))
    .orderBy(asc(dashboards.position), asc(dashboards.createdAt))
    .limit(1);

  if (!fallback) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create dashboard" });
  }

  return fallback;
}

async function readActiveId(userId: string): Promise<string | null> {
  const [prefs] = await db
    .select({ activeDashboardId: userPreferences.activeDashboardId })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return prefs?.activeDashboardId ?? null;
}

async function setActiveId(userId: string, id: string) {
  await db
    .insert(userPreferences)
    .values({ userId, activeDashboardId: id })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { activeDashboardId: id, updatedAt: new Date() },
    });
}

export const dashboardRouter = router({
  bootstrap: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const first = await ensureDashboard(userId);
    const all = await listDashboards(userId);

    const storedActive = await readActiveId(userId);
    const activeId = all.some((dashboard) => dashboard.id === storedActive)
      ? (storedActive as string)
      : first.id;

    return {
      dashboards: all,
      activeId,
      active: {
        id: activeId,
        name: all.find((dashboard) => dashboard.id === activeId)?.name ?? first.name,
        widgets: await getDashboardWidgets(activeId),
      },
    };
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    await ensureDashboard(userId);
    return listDashboards(userId);
  }),

  get: protectedProcedure.input(dashboardIdSchema).query(async ({ ctx, input }) => {
    const dashboard = await getOwnedDashboard(ctx.session.user.id, input.id);
    if (!dashboard) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
    }

    return {
      id: dashboard.id,
      name: dashboard.name,
      widgets: await getDashboardWidgets(dashboard.id),
    };
  }),

  listInstances: protectedProcedure
    .input(widgetInstanceListSchema)
    .query(async ({ ctx, input }) => {
      return db
        .select({
          id: widgetGroups.id,
          name: widgetGroups.name,
          isDefault: widgetGroups.isDefault,
        })
        .from(widgetGroups)
        .where(and(eq(widgetGroups.userId, ctx.session.user.id), eq(widgetGroups.kind, input.kind)))
        .orderBy(desc(widgetGroups.isDefault), asc(widgetGroups.createdAt));
    }),

  createInstance: protectedProcedure
    .input(widgetInstanceCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(widgetGroups)
        .values({
          userId: ctx.session.user.id,
          kind: input.kind,
          name: input.name ?? input.kind,
          isDefault: false,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create instance",
        });
      }

      return { id: created.id, name: created.name, isDefault: created.isDefault };
    }),

  updateInstance: protectedProcedure
    .input(widgetInstanceUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const patch: { name?: string; settings?: Record<string, unknown> | null } = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.settings !== undefined) patch.settings = input.settings ?? null;
      if (Object.keys(patch).length === 0) return { ok: true } as const;

      await db
        .update(widgetGroups)
        .set({ ...patch, updatedAt: new Date() })
        .where(
          and(eq(widgetGroups.id, input.groupId), eq(widgetGroups.userId, ctx.session.user.id))
        );

      return { ok: true } as const;
    }),

  create: protectedProcedure.input(dashboardCreateSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const all = await listDashboards(userId);

    const position = all.reduce((max, dashboard) => Math.max(max, dashboard.position), -1) + 1;
    const name = input.name ?? `Dashboard ${all.length + 1}`;

    const [created] = await db.insert(dashboards).values({ userId, name, position }).returning();

    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create dashboard" });
    }

    await setActiveId(userId, created.id);

    return { id: created.id, name: created.name, position: created.position };
  }),

  rename: protectedProcedure.input(dashboardRenameSchema).mutation(async ({ ctx, input }) => {
    const dashboard = await getOwnedDashboard(ctx.session.user.id, input.id);
    if (!dashboard) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
    }

    await db
      .update(dashboards)
      .set({ name: input.name, updatedAt: new Date() })
      .where(eq(dashboards.id, dashboard.id));

    return { ok: true } as const;
  }),

  remove: protectedProcedure.input(dashboardIdSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const all = await listDashboards(userId);

    if (!all.some((dashboard) => dashboard.id === input.id)) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
    }

    if (all.length <= 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must keep at least one dashboard" });
    }

    await db
      .delete(dashboards)
      .where(and(eq(dashboards.id, input.id), eq(dashboards.userId, userId)));

    const remaining = all.filter((dashboard) => dashboard.id !== input.id);
    const storedActive = await readActiveId(userId);
    if (!storedActive || storedActive === input.id) {
      await setActiveId(userId, remaining[0].id);
    }

    return { ok: true } as const;
  }),

  reorder: protectedProcedure.input(dashboardReorderSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    for (const [index, id] of input.ids.entries()) {
      await db
        .update(dashboards)
        .set({ position: index, updatedAt: new Date() })
        .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));
    }

    return { ok: true } as const;
  }),

  setActive: protectedProcedure.input(dashboardIdSchema).mutation(async ({ ctx, input }) => {
    const dashboard = await getOwnedDashboard(ctx.session.user.id, input.id);
    if (!dashboard) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
    }

    await setActiveId(ctx.session.user.id, dashboard.id);

    return { ok: true } as const;
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
      const userId = ctx.session.user.id;
      const rows = [];

      for (const widget of input.widgets) {
        let groupId = widget.groupId;
        if (groupId) {
          const [owned] = await db
            .select({ id: widgetGroups.id })
            .from(widgetGroups)
            .where(
              and(
                eq(widgetGroups.id, groupId),
                eq(widgetGroups.userId, userId),
                eq(widgetGroups.kind, widget.kind)
              )
            )
            .limit(1);
          if (!owned) groupId = undefined;
        }
        if (!groupId) groupId = await resolveGroupForKind(userId, widget.kind, widget.instanceName);

        rows.push({
          id: widget.id,
          dashboardId: dashboard.id,
          groupId,
          kind: widget.kind,
          size: widget.size,
          position: widget.position,
        });
      }

      await db
        .insert(widgets)
        .values(rows)
        .onConflictDoUpdate({
          target: widgets.id,
          set: {
            groupId: sql`excluded."groupId"`,
            kind: sql`excluded."kind"`,
            size: sql`excluded."size"`,
            position: sql`excluded."position"`,
          },
          where: sql`${widgets.dashboardId} = excluded."dashboardId"`,
        });
    }

    await db
      .update(dashboards)
      .set({ updatedAt: new Date() })
      .where(eq(dashboards.id, dashboard.id));

    return { ok: true, widgets: await getDashboardWidgets(dashboard.id) } as const;
  }),
});
