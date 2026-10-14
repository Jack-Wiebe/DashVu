import type { WidgetKind, WidgetSize } from "@dashvu/validators";

import { Icons } from "@/components/Icons";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import FunPackWidget from "@/components/widgets/FunPackWidget";
import GalleryWidget from "@/components/widgets/GalleryWidget";
import SpotifyWidget from "@/components/widgets/SpotifyWidget";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import type { WidgetConfig, WidgetDefinition } from "@/types/widget";

export const WIDGET_REGISTRY: Record<WidgetKind, WidgetDefinition> = {
  spotify: {
    kind: "spotify",
    Type: SpotifyWidget,
    Icon: Icons.spotify,
    defaultTitle: "Now Playing",
    defaultSize: "sm",
    sizes: ["sm", "md", "lrg"],
  },
  gallery: {
    kind: "gallery",
    Type: GalleryWidget,
    Icon: Icons.gallery,
    defaultTitle: "Gallery",
    defaultSize: "sm",
    sizes: ["sm", "md", "lrg"],
  },
  calendar: {
    kind: "calendar",
    Type: CalendarWidget,
    Icon: Icons.calendar,
    defaultTitle: "Calendar",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg"],
  },
  weather: {
    kind: "weather",
    Type: WeatherWidget,
    Icon: Icons.weather,
    defaultTitle: "Weather",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg"],
  },
  funPack: {
    kind: "funPack",
    Type: FunPackWidget,
    Icon: Icons.funPack,
    defaultTitle: "Daily Fun Pack",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg"],
  },
};

export const WIDGET_KINDS = Object.keys(WIDGET_REGISTRY) as WidgetKind[];

export const WIDGET_SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: "h-96 lg:col-span-1",
  md: "h-96 md:col-span-2 lg:col-span-2",
  lrg: "h-[34rem] md:col-span-2 lg:col-span-2",
};

export function createWidget(kind: WidgetKind): WidgetConfig {
  const definition = WIDGET_REGISTRY[kind];

  return {
    id: crypto.randomUUID(),
    kind,
    title: definition.defaultTitle,
    size: definition.defaultSize,
    settings: null,
  };
}
