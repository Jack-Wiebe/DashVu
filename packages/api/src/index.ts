import { calendarRouter } from "./routers/calendar";
import { dashboardRouter } from "./routers/dashboard";
import { funPackRouter } from "./routers/funPack";
import { newsRouter } from "./routers/news";
import { plannerRouter } from "./routers/planner";
import { spotifyRouter } from "./routers/spotify";
import { userRouter } from "./routers/user";
import { weatherRouter } from "./routers/weather";
import { router, t } from "./trpc";

export const appRouter = router({
  spotify: spotifyRouter,
  calendar: calendarRouter,
  weather: weatherRouter,
  funPack: funPackRouter,
  planner: plannerRouter,
  news: newsRouter,
  dashboard: dashboardRouter,
  user: userRouter,
});

export const createCaller = t.createCallerFactory(appRouter);

export type AppRouter = typeof appRouter;

export { createContext } from "./context";
export type { Context, ContextInput, SessionUser } from "./context";

export { CONNECTORS, getConnector } from "./connectors/registry";

export { fetchCached, invalidateCached, clearCache } from "./cache";
export { rateLimit, RateLimitError, resetRateLimits } from "./ratelimit";

export { createLogger } from "./logger";
export type { Logger, LogLevel } from "./logger";

export { resolveEntitlements, FREE_ENTITLEMENTS } from "./entitlements";
export type { Entitlements } from "./entitlements";
