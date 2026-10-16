import { eq } from "drizzle-orm";
import { db, userPreferences } from "@dashvu/db";
import { userPreferencesUpdateSchema } from "@dashvu/validators";
import { protectedProcedure, router } from "../trpc";

export const userRouter = router({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, ctx.session.user.id))
      .limit(1);

    return preferences ?? null;
  }),

  updatePreferences: protectedProcedure
    .input(userPreferencesUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const patch: { theme?: string; settings?: Record<string, unknown> | null } = {};
      if (input.theme !== undefined) patch.theme = input.theme;
      if (input.settings !== undefined) patch.settings = input.settings ?? null;

      if (Object.keys(patch).length > 0) {
        await db
          .insert(userPreferences)
          .values({ userId, ...patch })
          .onConflictDoUpdate({
            target: userPreferences.userId,
            set: { ...patch, updatedAt: new Date() },
          });
      }

      return { ok: true } as const;
    }),
});
