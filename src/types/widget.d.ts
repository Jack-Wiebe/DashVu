import { LucideIcon } from "lucide-react";

type WidgetType = string;
type WidgetSize = string;

declare module "Widget" {
  interface WigetProps {
    size: WidgetType;
    icon: WidgetIcon;
    type: LucideIcon;
  }
}

// Export the type for the props
export default Widget;
