import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

export interface WidgetComponentProps {
  className?: string;
}

export interface WidgetConfig {
  Icon?: ComponentType<LucideProps>;
  Type: ComponentType<WidgetComponentProps>;
  title?: string;
  size?: string;
}

export default WidgetConfig;
