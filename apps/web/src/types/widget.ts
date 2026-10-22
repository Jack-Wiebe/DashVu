import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import type { WidgetKind, WidgetSize } from "@dashvu/validators";

export interface WidgetComponentProps {
  widgetId: string;
  className?: string;
  size?: WidgetSize;
  settings?: Record<string, unknown> | null;
  onSettingsChange?: (settings: Record<string, unknown>) => void;
  index?: number;
}

export interface WidgetConfig {
  id: string;
  kind: WidgetKind;
  title: string;
  size: WidgetSize;
  settings: Record<string, unknown> | null;
  groupId?: string;
}

export interface WidgetDefinition {
  kind: WidgetKind;
  Type: ComponentType<WidgetComponentProps>;
  Icon?: ComponentType<LucideProps>;
  defaultTitle: string;
  defaultSize: WidgetSize;
}

export default WidgetConfig;
