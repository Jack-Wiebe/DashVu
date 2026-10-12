import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@dashvu/api";

import { auth } from "@/auth";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => ({ session: await auth() }),
  });

export { handler as GET, handler as POST };
