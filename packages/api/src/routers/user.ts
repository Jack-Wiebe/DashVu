import { eq } from "drizzle-orm";
import { db, userPreferences } from "@dashvu/db";
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
});
