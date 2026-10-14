import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";

import { dashboards, db, widgetGroups, widgetItems, widgets } from "@dashvu/db";
import {
  plannerItemCreateSchema,
  plannerItemRemoveSchema,
  plannerItemUpdateSchema,
  plannerItemsInputSchema,
  plannerItemsReorderSchema,
  type PlannerMode,
} from "@dashvu/validators";

import { protectedProcedure, router } from "../trpc";

type ItemRow = typeof widgetItems.$inferSelect;

function serializeItem(row: ItemRow) {
  return {
    id: row.id,
    mode: row.mode as PlannerMode,
    position: row.position,
    text: row.text,
    checked: row.checked,
    date: row.date ? row.date.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveGroup(userId: string, widgetId: string): Promise<string | null> {
  const [row] = await db
    .select({ groupId: widgets.groupId })
    .from(widgets)
    .innerJoin(dashboards, eq(widgets.dashboardId, dashboards.id))
    .where(and(eq(widgets.id, widgetId), eq(dashboards.userId, userId)))
    .limit(1);

  return row?.groupId ?? null;
}

async function requireGroup(userId: string, widgetId: string): Promise<string> {
  const groupId = await resolveGroup(userId, widgetId);
  if (!groupId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Widget not found" });
  }
  return groupId;
}

async function assertItemOwned(userId: string, itemId: string) {
  const [row] = await db
    .select({ id: widgetItems.id })
    .from(widgetItems)
    .innerJoin(widgetGroups, eq(widgetItems.groupId, widgetGroups.id))
    .where(and(eq(widgetItems.id, itemId), eq(widgetGroups.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
  }
}

export const plannerRouter = router({
  list: protectedProcedure.input(plannerItemsInputSchema).query(async ({ ctx, input }) => {
    // A freshly-added widget may not be persisted yet (the dashboard renders it
    // optimistically before saveLayout commits), so treat an unknown widget as
    // an empty list rather than erroring.
    const groupId = await resolveGroup(ctx.session.user.id, input.widgetId);
    if (!groupId) {
      return [];
    }

    const rows = await db
      .select()
      .from(widgetItems)
      .where(and(eq(widgetItems.groupId, groupId), eq(widgetItems.mode, input.mode)))
      .orderBy(asc(widgetItems.position), asc(widgetItems.createdAt));

    return rows.map(serializeItem);
  }),

  create: protectedProcedure.input(plannerItemCreateSchema).mutation(async ({ ctx, input }) => {
    const groupId = await requireGroup(ctx.session.user.id, input.widgetId);

    const [max] = await db
      .select({ position: sql<number>`coalesce(max(${widgetItems.position}), -1)` })
      .from(widgetItems)
      .where(and(eq(widgetItems.groupId, groupId), eq(widgetItems.mode, input.mode)));

    const [row] = await db
      .insert(widgetItems)
      .values({
        groupId,
        mode: input.mode,
        position: (max?.position ?? -1) + 1,
        text: input.text,
        checked: false,
        date: input.date ? new Date(input.date) : null,
      })
      .returning();

    return serializeItem(row);
  }),

  update: protectedProcedure.input(plannerItemUpdateSchema).mutation(async ({ ctx, input }) => {
    await assertItemOwned(ctx.session.user.id, input.id);

    const values: Partial<typeof widgetItems.$inferInsert> = { updatedAt: new Date() };
    if (input.text !== undefined) values.text = input.text;
    if (input.checked !== undefined) values.checked = input.checked;
    if (input.date !== undefined) values.date = input.date ? new Date(input.date) : null;

    const [row] = await db
      .update(widgetItems)
      .set(values)
      .where(eq(widgetItems.id, input.id))
      .returning();

    return serializeItem(row);
  }),

  remove: protectedProcedure.input(plannerItemRemoveSchema).mutation(async ({ ctx, input }) => {
    await assertItemOwned(ctx.session.user.id, input.id);
    await db.delete(widgetItems).where(eq(widgetItems.id, input.id));
    return { ok: true } as const;
  }),

  removeChecked: protectedProcedure
    .input(plannerItemsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const groupId = await requireGroup(ctx.session.user.id, input.widgetId);
      await db
        .delete(widgetItems)
        .where(
          and(
            eq(widgetItems.groupId, groupId),
            eq(widgetItems.mode, input.mode),
            eq(widgetItems.checked, true)
          )
        );
      return { ok: true } as const;
    }),

  reorder: protectedProcedure.input(plannerItemsReorderSchema).mutation(async ({ ctx, input }) => {
    const groupId = await requireGroup(ctx.session.user.id, input.widgetId);

    for (let index = 0; index < input.ids.length; index++) {
      await db
        .update(widgetItems)
        .set({ position: index, updatedAt: new Date() })
        .where(
          and(
            eq(widgetItems.id, input.ids[index]),
            eq(widgetItems.groupId, groupId),
            eq(widgetItems.mode, input.mode)
          )
        );
    }

    return { ok: true } as const;
  }),
});
