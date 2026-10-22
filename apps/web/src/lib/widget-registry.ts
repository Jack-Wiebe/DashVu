import type { WidgetKind, WidgetSize } from "@dashvu/validators";
import { parseWidgetSize } from "@dashvu/core";

import { Icons } from "@/components/Icons";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import CalculatorWidget from "@/components/widgets/CalculatorWidget";
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
    defaultSize: "1w1h",
  },
  gallery: {
    kind: "gallery",
    Type: GalleryWidget,
    Icon: Icons.gallery,
    defaultTitle: "Gallery",
    defaultSize: "1w1h",
  },
  calendar: {
    kind: "calendar",
    Type: CalendarWidget,
    Icon: Icons.calendar,
    defaultTitle: "Calendar",
    defaultSize: "2w1h",
  },
  weather: {
    kind: "weather",
    Type: WeatherWidget,
    Icon: Icons.weather,
    defaultTitle: "Weather",
    defaultSize: "2w1h",
  },
  funPack: {
    kind: "funPack",
    Type: FunPackWidget,
    Icon: Icons.funPack,
    defaultTitle: "Daily Fun Pack",
    defaultSize: "2w1h",
  },
  planner: {
    kind: "planner",
    Type: PlannerWidget,
    Icon: Icons.planner,
    defaultTitle: "Planner",
    defaultSize: "2w1h",
  },
  canvas: {
    kind: "canvas",
    Type: GenerativeArtWidget,
    Icon: Icons.canvas,
    defaultTitle: "Generative Art",
    defaultSize: "2w1h",
  },
  news: {
    kind: "news",
    Type: NewsWidget,
    Icon: Icons.news,
    defaultTitle: "News Briefing",
    defaultSize: "2w1h",
  },
  discover: {
    kind: "discover",
    Type: DiscoverWidget,
    Icon: Icons.discover,
    defaultTitle: "Discover",
    defaultSize: "2w1h",
  },
  dictionary: {
    kind: "dictionary",
    Type: DictionaryWidget,
    Icon: Icons.dictionary,
    defaultTitle: "Dictionary",
    defaultSize: "2w1h",
  },
  map: {
    kind: "map",
    Type: MapWidget,
    Icon: Icons.map,
    defaultTitle: "Map",
    defaultSize: "2w1h",
  },
  calculator: {
    kind: "calculator",
    Type: CalculatorWidget,
    Icon: Icons.calculator,
    defaultTitle: "Calculator",
    defaultSize: "1w1h",
  },
};

export const WIDGET_KINDS = Object.keys(WIDGET_REGISTRY) as WidgetKind[];

const COLUMN_SPAN: Record<number, string> = {
  1: "",
  2: "md:col-span-2 lg:col-span-2",
  3: "md:col-span-2 lg:col-span-3",
};

const ROW_SPAN: Record<number, string> = {
  1: "",
  2: "row-span-2",
  3: "row-span-3",
  4: "row-span-4",
  5: "row-span-5",
  6: "row-span-6",
};

export function widgetSizeClasses(size: WidgetSize): string {
  const { width, height } = parseWidgetSize(size);
  return [COLUMN_SPAN[Math.min(width, 3)] ?? "", ROW_SPAN[Math.min(height, 6)] ?? ""]
    .filter(Boolean)
    .join(" ");
}

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
