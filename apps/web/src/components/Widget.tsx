import React from "react";
import { cn } from "@/lib/utils";
import type { WidgetConfig } from "@/types/widget";

const Widget: React.FC<{ config: WidgetConfig; className?: string }> = ({ config, className }) => {
  const { Icon, Type, title, size } = config;

  return (
    <section
      className={cn("flex h-96 flex-col rounded-md border border-zinc-800 p-4", size, className)}
    >
      {(Icon || title) && (
        <header className="mb-3 flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5" /> : null}
          {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
        </header>
      )}

      <div className="min-h-0 flex-1">
        <Type className="h-full" />
      </div>
    </section>
  );
};

export default Widget;
