import { calendarEventsInputSchema } from "@dashvu/validators";
import { getConnector } from "../connectors/registry";
import { protectedProcedure, router } from "../trpc";

export const calendarRouter = router({
  getEvents: protectedProcedure.input(calendarEventsInputSchema).query(async ({ ctx, input }) => {
    const calendar = await getConnector("google").invoke(ctx.session.user.id, undefined);

    const { data } = await calendar.events.list({
      calendarId: "primary",
      timeMin: input.timeMin ?? new Date().toISOString(),
      timeMax: input.timeMax,
      maxResults: input.maxResults ?? 100,
      singleEvents: true,
      orderBy: "startTime",
    });

    return (data.items ?? [])
      .filter((event) => event.start && event.end)
      .map((event) => {
        const start = event.start!.dateTime ?? event.start!.date!;
        const end = event.end!.dateTime ?? event.end!.date!;

        return {
          id: event.id ?? `${start}-${event.summary ?? "event"}`,
          title: event.summary ?? "(No title)",
          start,
          end,
          allDay: Boolean(event.start!.date),
          location: event.location ?? null,
          htmlLink: event.htmlLink ?? null,
        };
      });
  }),
});
