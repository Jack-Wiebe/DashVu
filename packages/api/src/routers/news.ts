import { newsBriefingInputSchema } from "@dashvu/validators";

import { getConnector } from "../connectors/registry";
import { protectedProcedure, router } from "../trpc";

export const newsRouter = router({
  getBriefing: protectedProcedure.input(newsBriefingInputSchema).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    switch (input.source) {
      case "hackerNews":
        return getConnector("hackerNews").invoke(userId, { limit: input.limit });
      case "spaceflightNews":
        return getConnector("spaceflightNews").invoke(userId, { limit: input.limit });
      case "bbcNews":
        return getConnector("bbcNews").invoke(userId, { limit: input.limit });
      case "alJazeera":
        return getConnector("alJazeera").invoke(userId, { limit: input.limit });
      case "allsides":
        return getConnector("allsides").invoke(userId, { limit: input.limit });
    }
  }),
});
