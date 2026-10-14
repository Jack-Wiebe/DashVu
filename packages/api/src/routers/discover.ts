import { getConnector } from "../connectors/registry";
import { protectedProcedure, router } from "../trpc";

export const discoverRouter = router({
  getArt: protectedProcedure.query(async () => {
    return getConnector("cleveland").invoke(null, undefined);
  }),
  getSpace: protectedProcedure.query(async () => {
    return getConnector("nasaImages").invoke(null, undefined);
  }),
});
