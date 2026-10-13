"use client";

import { useEffect, useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import type { View } from "react-big-calendar";
import moment from "moment";
import { ExternalLink, MapPin, X } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { cn } from "@/lib/utils";

const localizer = momentLocalizer(moment);

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  location?: string;
  htmlLink?: string;
}

interface CalendarViewsProps {
  events: CalendarEvent[];
  view: View;
  date: Date;
  onView: (view: View) => void;
  onNavigate: (date: Date) => void;
  className?: string;
}

function formatWhen(event: CalendarEvent) {
  const start = moment(event.start);
  const end = moment(event.end);

  if (event.allDay) {
    return `${start.format("ddd, MMM D")} · All day`;
  }

  const endFormat = start.isSame(end, "day") ? "h:mm A" : "ddd, MMM D · h:mm A";
  return `${start.format("ddd, MMM D · h:mm A")} – ${end.format(endFormat)}`;
}

const CalendarViews = ({
  events,
  view,
  date,
  onView,
  onNavigate,
  className,
}: CalendarViewsProps) => {
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!selected) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected]);

  const handleView = (next: View) => {
    setSelected(null);
    onView(next);
  };

  const handleNavigate = (next: Date) => {
    setSelected(null);
    onNavigate(next);
  };

  return (
    <div className={cn("dashvu-calendar relative h-full overflow-hidden", className)}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        view={view}
        date={date}
        onView={handleView}
        onNavigate={handleNavigate}
        onSelectEvent={(event: CalendarEvent) => setSelected(event)}
        popup
        style={{ height: "100%" }}
      />

      {selected ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-3"
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Event details"
            className="max-h-full w-full max-w-xs overflow-auto rounded-md border border-zinc-700 bg-zinc-900 p-4 text-zinc-100 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{selected.title}</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-xs text-zinc-400">{formatWhen(selected)}</p>

            {selected.location ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-zinc-300">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{selected.location}</span>
              </p>
            ) : null}

            {selected.htmlLink ? (
              <a
                href={selected.htmlLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Google Calendar
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CalendarViews;
