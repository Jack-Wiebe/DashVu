import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db, widgetGroups } from "@dashvu/db";

async function findDefaultGroup(userId: string, kind: string): Promise<string | null> {
  const [row] = await db
    .select({ id: widgetGroups.id })
    .from(widgetGroups)
    .where(
      and(
        eq(widgetGroups.userId, userId),
        eq(widgetGroups.kind, kind),
        eq(widgetGroups.isDefault, true)
      )
    )
    .limit(1);

  return row?.id ?? null;
}

/**
 * Resolve (find-or-create) the default widget group for a user and widget kind.
 * All widgets of a kind join this group by default, so they share content.
 */
export async function resolveGroupForKind(userId: string, kind: string): Promise<string> {
  const existing = await findDefaultGroup(userId, kind);
  if (existing) return existing;

  try {
    const [created] = await db
      .insert(widgetGroups)
      .values({ userId, kind, name: kind, isDefault: true })
      .returning();

    if (created) return created.id;
  } catch {
    // A concurrent request won the unique (userId, kind) default-group race;
    // fall through and re-select below.
  }

  const raced = await findDefaultGroup(userId, kind);
  if (!raced) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not resolve widget group",
    });
  }

  return raced;
}
