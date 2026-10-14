import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import type { WidgetKind, WidgetSize } from "@dashvu/validators";

export interface WidgetComponentProps {
  className?: string;
  settings?: Record<string, unknown> | null;
  onSettingsChange?: (settings: Record<string, unknown>) => void;
}

export interface WidgetConfig {
  id: string;
  kind: WidgetKind;
  title: string;
  size: WidgetSize;
  settings: Record<string, unknown> | null;
}

export interface WidgetDefinition {
  kind: WidgetKind;
  Type: ComponentType<WidgetComponentProps>;
  Icon?: ComponentType<LucideProps>;
  defaultTitle: string;
  defaultSize: WidgetSize;
  sizes: WidgetSize[];
}

export default WidgetConfig;
