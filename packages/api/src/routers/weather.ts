import { weatherCurrentInputSchema, weatherSearchInputSchema } from "@dashvu/validators";

import { getConnector } from "../connectors/registry";
import { protectedProcedure, router } from "../trpc";

export const weatherRouter = router({
  getOverview: protectedProcedure.input(weatherCurrentInputSchema).query(async ({ ctx, input }) => {
    const connector = getConnector("openMeteo");
    return connector.invoke(ctx.session.user.id, {
      latitude: input.latitude,
      longitude: input.longitude,
    });
  }),

  searchLocations: protectedProcedure
    .input(weatherSearchInputSchema)
    .query(async ({ ctx, input }) => {
      const connector = getConnector("openMeteoGeocoding");
      return connector.invoke(ctx.session.user.id, { query: input.query });
    }),

  getRadar: protectedProcedure.query(async ({ ctx }) => {
    const connector = getConnector("rainViewer");
    return connector.invoke(ctx.session.user.id, undefined);
  }),
});
