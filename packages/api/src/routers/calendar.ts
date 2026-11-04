import type { calendar_v3 } from "@googleapis/calendar";
import type { tasks_v1 } from "@googleapis/tasks";
import { calendarEventsInputSchema } from "@dashvu/validators";

import { fetchCached } from "../cache";
import { getConnector } from "../connectors/registry";
import { getTasksClientForUser } from "../google";
import { createLogger } from "../logger";
import { protectedProcedure, router } from "../trpc";

const logger = createLogger("calendar");

const CALENDAR_LIST_TTL_MS = 5 * 60_000;
const EVENTS_TTL_MS = 60_000;
const MAX_CONCURRENCY = 5;
const MAX_PAGES = 10;
const TASKS_PAGE_SIZE = 100;

export const BIRTHDAYS_CALENDAR_ID = "__birthdays__";
export const TASKS_CALENDAR_ID = "__tasks__";

const BIRTHDAYS_COLOR = "#A142F4";
const TASKS_COLOR = "#4A86E8";
const SYNTHETIC_FOREGROUND = "#ffffff";

interface CalendarSummary {
  id: string;
  name: string;
  color: string | null;
  foregroundColor: string | null;
  primary: boolean;
  accessRole: string | null;
}

interface CalendarEventItem {
  id: string;
  calendarId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
  eventType: string;
}

interface CalendarEventRow extends CalendarEventItem {
  color: string | null;
  foregroundColor: string | null;
}

interface TaskRecord {
  id: string;
  listId: string;
  title: string;
  due: string | null;
  webViewLink: string | null;
}

type TasksError = "disabled" | "scope" | "unknown";

const BIRTHDAYS_CALENDAR: CalendarSummary = {
  id: BIRTHDAYS_CALENDAR_ID,
  name: "Birthdays",
  color: BIRTHDAYS_COLOR,
  foregroundColor: SYNTHETIC_FOREGROUND,
  primary: false,
  accessRole: "reader",
};

const TASKS_CALENDAR: CalendarSummary = {
  id: TASKS_CALENDAR_ID,
  name: "Tasks",
  color: TASKS_COLOR,
  foregroundColor: SYNTHETIC_FOREGROUND,
  primary: false,
  accessRole: "reader",
};

async function loadCalendars(
  userId: string,
  client: calendar_v3.Calendar
): Promise<CalendarSummary[]> {
  return fetchCached(`calendar:list:${userId}`, CALENDAR_LIST_TTL_MS, async () => {
    const entries: calendar_v3.Schema$CalendarListEntry[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const { data } = await client.calendarList.list({
        maxResults: 250,
        showHidden: true,
        showDeleted: false,
        pageToken,
      });

      entries.push(...(data.items ?? []));

      pageToken = data.nextPageToken ?? undefined;
      if (!pageToken) break;
    }

    return entries
      .filter(
        (entry): entry is calendar_v3.Schema$CalendarListEntry & { id: string } =>
          Boolean(entry.id) && !entry.deleted && entry.accessRole !== "freeBusyReader"
      )
      .map((entry) => ({
        id: entry.id,
        name: entry.summaryOverride ?? entry.summary ?? entry.id,
        color: entry.backgroundColor ?? null,
        foregroundColor: entry.foregroundColor ?? null,
        primary: Boolean(entry.primary),
        accessRole: entry.accessRole ?? null,
      }));
  });
}

async function listEventsForCalendar(
  client: calendar_v3.Calendar,
  calendarId: string,
  range: { timeMin: string; timeMax?: string; maxResults: number }
): Promise<CalendarEventItem[]> {
  const items: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const remaining = range.maxResults - items.length;
    if (remaining <= 0) break;

    const { data } = await client.events.list({
      calendarId,
      timeMin: range.timeMin,
      timeMax: range.timeMax,
      maxResults: remaining,
      singleEvents: true,
      orderBy: "startTime",
      pageToken,
    });

    items.push(...(data.items ?? []));

    pageToken = data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  return items
    .slice(0, range.maxResults)
    .map((event) => {
      const start = event.start?.dateTime ?? event.start?.date;
      const end = event.end?.dateTime ?? event.end?.date;
      if (!start || !end) return null;

      return {
        id: `${calendarId}:${event.id ?? `${start}-${event.summary ?? "event"}`}`,
        calendarId,
        title: event.summary ?? "(No title)",
        start,
        end,
        allDay: Boolean(event.start?.date),
        location: event.location ?? null,
        htmlLink: event.htmlLink ?? null,
        eventType: event.eventType ?? "default",
      };
    })
    .filter((event): event is CalendarEventItem => event !== null);
}

function nextDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

async function listTasksInList(client: tasks_v1.Tasks, taskListId: string): Promise<TaskRecord[]> {
  if (!taskListId) return [];

  const items: tasks_v1.Schema$Task[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data } = await client.tasks.list({
      tasklist: taskListId,
      showCompleted: false,
      showHidden: false,
      maxResults: TASKS_PAGE_SIZE,
      pageToken,
    });

    items.push(...(data.items ?? []));

    pageToken = data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  return items.flatMap((task) => {
    if (!task.id || task.status === "completed" || task.deleted || task.hidden) {
      return [];
    }

    return [
      {
        id: task.id,
        listId: taskListId,
        title: task.title ?? "(No title)",
        due: task.due ?? null,
        webViewLink: task.webViewLink ?? null,
      },
    ];
  });
}

async function loadTasks(userId: string): Promise<TaskRecord[]> {
  const client = await getTasksClientForUser(userId);

  const lists: tasks_v1.Schema$TaskList[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data } = await client.tasklists.list({ maxResults: 1000, pageToken });
    lists.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  const results = await mapWithConcurrency(lists, MAX_CONCURRENCY, (list) =>
    listTasksInList(client, list.id ?? "")
  );

  const tasks: TaskRecord[] = [];

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.warn("Failed to load task list", {
        taskListId: lists[index].id,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      return;
    }

    tasks.push(...result.value);
  });

  return tasks;
}

function describeTasksError(error: unknown): TasksError {
  const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
  const data = response?.data as
    | {
        error?: {
          errors?: Array<{ reason?: string | null }>;
          details?: Array<{ reason?: string | null }>;
        };
      }
    | undefined;

  const reasons = [
    ...(data?.error?.errors ?? []).map((entry) => entry.reason ?? ""),
    ...(data?.error?.details ?? []).map((entry) => entry.reason ?? ""),
  ];
  const message = error instanceof Error ? error.message : "";

  if (
    response?.status === 403 &&
    (reasons.includes("accessNotConfigured") || reasons.includes("SERVICE_DISABLED"))
  ) {
    return "disabled";
  }

  if (response?.status === 403 && reasons.includes("insufficientPermissions")) {
    return "scope";
  }

  if (/has not been used in project|SERVICE_DISABLED|is disabled/i.test(message)) {
    return "disabled";
  }

  if (/insufficient (authentication )?scopes?|insufficient permission/i.test(message)) {
    return "scope";
  }

  return "unknown";
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;

      try {
        results[index] = { status: "fulfilled", value: await fn(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export const calendarRouter = router({
  listCalendars: protectedProcedure.query(async ({ ctx }) => {
    const client = await getConnector("google").invoke(ctx.session.user.id, undefined);
    const calendars = await loadCalendars(ctx.session.user.id, client);

    const result = [...calendars, BIRTHDAYS_CALENDAR];
    if (ctx.session.user.hasTasks) result.push(TASKS_CALENDAR);

    return result;
  }),

  getEvents: protectedProcedure.input(calendarEventsInputSchema).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const client = await getConnector("google").invoke(userId, undefined);
    const calendars = await loadCalendars(userId, client);

    const excluded = new Set(input.excludeCalendarIds ?? []);
    const showBirthdays = !excluded.has(BIRTHDAYS_CALENDAR_ID);
    const showTasks = !excluded.has(TASKS_CALENDAR_ID) && Boolean(ctx.session.user.hasTasks);

    const timeMin = input.timeMin ?? new Date().toISOString();
    const timeMax = input.timeMax;
    const maxResults = input.maxResults ?? 100;

    const today = input.today ?? new Date().toISOString().slice(0, 10);
    const minDate = input.timeMinDate ?? timeMin.slice(0, 10);
    const maxDate = input.timeMaxDate ?? (timeMax ? timeMax.slice(0, 10) : null);

    const fetchSet = calendars.filter(
      (calendar) => !excluded.has(calendar.id) || (showBirthdays && calendar.primary)
    );

    const events: CalendarEventRow[] = [];

    if (fetchSet.length > 0) {
      const results = await mapWithConcurrency(fetchSet, MAX_CONCURRENCY, (calendar) =>
        fetchCached(
          `calendar:events:${userId}:${calendar.id}:${timeMin}:${timeMax ?? ""}:${maxResults}`,
          EVENTS_TTL_MS,
          () => listEventsForCalendar(client, calendar.id, { timeMin, timeMax, maxResults })
        )
      );

      results.forEach((result, index) => {
        const calendar = fetchSet[index];

        if (result.status === "rejected") {
          logger.warn("Failed to load calendar events", {
            calendarId: calendar.id,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
          return;
        }

        for (const event of result.value) {
          if (event.eventType === "birthday") {
            if (!showBirthdays) continue;
            events.push({
              ...event,
              calendarId: BIRTHDAYS_CALENDAR_ID,
              color: BIRTHDAYS_COLOR,
              foregroundColor: SYNTHETIC_FOREGROUND,
            });
            continue;
          }

          if (excluded.has(calendar.id)) continue;

          events.push({
            ...event,
            color: calendar.color,
            foregroundColor: calendar.foregroundColor,
          });
        }
      });
    }

    let tasksError: TasksError | null = null;

    if (showTasks) {
      try {
        const tasks = await fetchCached(`calendar:tasks:${userId}`, EVENTS_TTL_MS, () =>
          loadTasks(userId)
        );

        for (const task of tasks) {
          const date = task.due ? task.due.slice(0, 10) : today;
          if (date < minDate) continue;
          if (maxDate && date >= maxDate) continue;

          events.push({
            id: `${TASKS_CALENDAR_ID}:${task.listId}:${task.id}`,
            calendarId: TASKS_CALENDAR_ID,
            title: task.title,
            start: date,
            end: nextDay(date),
            allDay: true,
            location: null,
            htmlLink: task.webViewLink,
            eventType: "task",
            color: TASKS_COLOR,
            foregroundColor: SYNTHETIC_FOREGROUND,
          });
        }
      } catch (error) {
        tasksError = describeTasksError(error);
        logger.warn("Failed to load tasks", {
          reason: tasksError,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      events: events.sort((a, b) => a.start.localeCompare(b.start)),
      tasksError,
    };
  }),
});
