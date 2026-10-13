"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { signIn, useSession } from "next-auth/react";
import type { View } from "react-big-calendar";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { WidgetComponentProps } from "@/types/widget";

import { Button } from "../ui/Button";
import type { CalendarEvent } from "./CalendarViews";

const CalendarViews = dynamic(() => import("./CalendarViews"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded bg-zinc-800" />,
});

function parseDate(value: string, allDay: boolean) {
  if (allDay) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getRange(view: View, date: Date) {
  const base = startOfDay(date);

  if (view === "day") {
    const timeMax = new Date(base);
    timeMax.setDate(timeMax.getDate() + 1);
    return { timeMin: base, timeMax };
  }

  if (view === "week" || view === "work_week") {
    const timeMin = new Date(base);
    timeMin.setDate(timeMin.getDate() - base.getDay() - 1);
    const timeMax = new Date(base);
    timeMax.setDate(timeMax.getDate() - base.getDay() + 8);
    return { timeMin, timeMax };
  }

  const timeMin = new Date(base.getFullYear(), base.getMonth(), 1);
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date(base.getFullYear(), base.getMonth() + 2, 1);
  return { timeMin, timeMax };
}

const CalendarWidget: React.FC<WidgetComponentProps> = ({ className }) => {
  const { data: session, status } = useSession();
  const hasCalendar = Boolean(session?.user.hasCalendar);

  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(() => new Date());

  const queryInput = useMemo(() => {
    const { timeMin, timeMax } = getRange(view, date);
    return { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), maxResults: 250 };
  }, [view, date]);

  const events = trpc.calendar.getEvents.useQuery(queryInput, {
    enabled: hasCalendar,
    retry: false,
    placeholderData: keepPreviousData,
  });

  if (status === "loading") {
    return <div className={cn(className, "text-sm")}>Loading…</div>;
  }

  if (!hasCalendar) {
    return (
      <div className={cn(className, "flex flex-col items-center justify-center gap-2 text-sm")}>
        <p>Google Calendar is not connected.</p>
        <Button size="sm" onClick={() => signIn("google", { callbackUrl: "/" })}>
          Connect Calendar
        </Button>
      </div>
    );
  }

  if (events.isError) {
    return (
      <div className={cn(className, "flex items-center justify-center text-sm")}>
        <p>Could not load calendar events.</p>
      </div>
    );
  }

  const calendarEvents: CalendarEvent[] =
    events.data?.map((event) => ({
      id: event.id,
      title: event.title,
      start: parseDate(event.start, event.allDay),
      end: parseDate(event.end, event.allDay),
      allDay: event.allDay,
      location: event.location ?? undefined,
      htmlLink: event.htmlLink ?? undefined,
    })) ?? [];

  return (
    <CalendarViews
      className={className}
      events={calendarEvents}
      view={view}
      onView={setView}
      date={date}
      onNavigate={setDate}
    />
  );
};

export default CalendarWidget;
