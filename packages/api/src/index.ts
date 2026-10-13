import { calendarRouter } from "./routers/calendar";
import { dashboardRouter } from "./routers/dashboard";
import { spotifyRouter } from "./routers/spotify";
import { userRouter } from "./routers/user";
import { router, t } from "./trpc";

export const appRouter = router({
  spotify: spotifyRouter,
  calendar: calendarRouter,
  dashboard: dashboardRouter,
  user: userRouter,
});

export const createCaller = t.createCallerFactory(appRouter);

export type AppRouter = typeof appRouter;
export type { Context, SessionUser } from "./context";
