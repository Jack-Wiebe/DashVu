import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

const loggingMiddleware = t.middleware(async ({ ctx, path, type, next }) => {
  const startedAt = Date.now();
  const result = await next();
  ctx.logger.debug("trpc request", {
    path,
    type,
    ok: result.ok,
    ms: Date.now() - startedAt,
  });
  return result;
});

const entitlementsMiddleware = t.middleware(({ ctx, next }) =>
  next({ ctx: { entitlements: ctx.entitlements } })
);

const rateLimitMiddleware = t.middleware(({ next }) => next());

const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { session: ctx.session } });
});

export const publicProcedure = t.procedure.use(loggingMiddleware);

export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(entitlementsMiddleware)
  .use(rateLimitMiddleware)
  .use(authMiddleware);
