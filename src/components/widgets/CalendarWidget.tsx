import React from "react";
import { cn } from "@/lib/utils";
import type { WidgetComponentProps } from "@/types/widget";

// Widget placeholder until the Google Calendar integration is rebuilt
// server-side behind an authenticated tRPC/route layer (Phase 3/5).
const CalendarWidget: React.FC<WidgetComponentProps> = ({ className }) => {
  return (
    <div
      className={cn(
        className,
        "flex h-full flex-col items-center justify-center gap-2 text-center"
      )}
    >
      <p className="text-sm text-slate-300">Calendar</p>
      <p className="text-xs text-slate-400">
        Connect your Google Calendar in settings to see your events here.
      </p>
    </div>
  );
};

export default CalendarWidget;