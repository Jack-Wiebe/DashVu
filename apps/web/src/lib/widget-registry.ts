import type { WidgetKind, WidgetSize } from "@dashvu/validators";

import { Icons } from "@/components/Icons";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import DictionaryWidget from "@/components/widgets/DictionaryWidget";
import DiscoverWidget from "@/components/widgets/DiscoverWidget";
import FunPackWidget from "@/components/widgets/FunPackWidget";
import GenerativeArtWidget from "@/components/widgets/GenerativeArtWidget";
import GalleryWidget from "@/components/widgets/GalleryWidget";
import MapWidget from "@/components/widgets/MapWidget";
import NewsWidget from "@/components/widgets/NewsWidget";
import PlannerWidget from "@/components/widgets/PlannerWidget";
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
    sizes: ["sm", "md", "lrg", "xl"],
  },
  gallery: {
    kind: "gallery",
    Type: GalleryWidget,
    Icon: Icons.gallery,
    defaultTitle: "Gallery",
    defaultSize: "sm",
    sizes: ["sm", "md", "lrg", "xl"],
  },
  calendar: {
    kind: "calendar",
    Type: CalendarWidget,
    Icon: Icons.calendar,
    defaultTitle: "Calendar",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg", "xl"],
  },
  weather: {
    kind: "weather",
    Type: WeatherWidget,
    Icon: Icons.weather,
    defaultTitle: "Weather",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg", "xl"],
  },
  funPack: {
    kind: "funPack",
    Type: FunPackWidget,
    Icon: Icons.funPack,
    defaultTitle: "Daily Fun Pack",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg", "xl"],
  },
  planner: {
    kind: "planner",
    Type: PlannerWidget,
    Icon: Icons.planner,
    defaultTitle: "Planner",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg", "xl"],
  },
  canvas: {
    kind: "canvas",
    Type: GenerativeArtWidget,
    Icon: Icons.canvas,
    defaultTitle: "Generative Art",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg", "xl"],
  },
  news: {
    kind: "news",
    Type: NewsWidget,
    Icon: Icons.news,
    defaultTitle: "News Briefing",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg", "xl"],
  },
  discover: {
    kind: "discover",
    Type: DiscoverWidget,
    Icon: Icons.discover,
    defaultTitle: "Discover",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg", "xl"],
  },
  dictionary: {
    kind: "dictionary",
    Type: DictionaryWidget,
    Icon: Icons.dictionary,
    defaultTitle: "Dictionary",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg", "xl"],
  },
  map: {
    kind: "map",
    Type: MapWidget,
    Icon: Icons.map,
    defaultTitle: "Map",
    defaultSize: "md",
    sizes: ["sm", "md", "lrg", "xl"],
  },
};

export const WIDGET_KINDS = Object.keys(WIDGET_REGISTRY) as WidgetKind[];

export const WIDGET_SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: "h-96 lg:col-span-1",
  md: "h-96 md:col-span-2 lg:col-span-2",
  lrg: "h-[34rem] md:col-span-2 lg:col-span-2",
  xl: "h-[50rem] md:col-span-2 lg:col-span-2",
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
