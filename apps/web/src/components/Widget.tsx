import React from "react";

import { cn } from "@/lib/utils";
import { WIDGET_REGISTRY, WIDGET_SIZE_CLASSES } from "@/lib/widget-registry";
import type { WidgetConfig } from "@/types/widget";

const Widget: React.FC<{
  config: WidgetConfig;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
  innerRef?: React.Ref<HTMLElement>;
  onSettingsChange?: (settings: Record<string, unknown>) => void;
}> = ({ config, actions, style, innerRef, onSettingsChange }) => {
  const definition = WIDGET_REGISTRY[config.kind];

  if (!definition) {
    return (
      <section
        ref={innerRef}
        style={style}
        className={cn(
          "flex flex-col items-center justify-center rounded-md border border-dashed border-zinc-700 p-4 text-sm text-slate-300",
          WIDGET_SIZE_CLASSES[config.size]
        )}
      >
        Unknown widget: {config.kind}
      </section>
    );
  }

  const { Icon, Type } = definition;

  return (
    <section
      ref={innerRef}
      style={style}
      className={cn(
        "flex flex-col rounded-md border border-zinc-800 p-4",
        WIDGET_SIZE_CLASSES[config.size]
      )}
    >
      <header className="mb-3 flex items-center gap-2">
        {Icon ? <Icon className="h-5 w-5" /> : null}
        {config.title ? <h2 className="text-sm font-medium">{config.title}</h2> : null}
        {actions ? <div className="ml-auto flex items-center gap-1">{actions}</div> : null}
      </header>

      <div className="min-h-0 flex-1">
        <Type className="h-full" settings={config.settings} onSettingsChange={onSettingsChange} />
      </div>
    </section>
  );
};

export default Widget;
