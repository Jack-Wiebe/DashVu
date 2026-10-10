import { Icons } from "@/components/Icons";
import Widget from "@/components/Widget";
import SpotifyWidget from "@/components/widgets/SpotifyWidget";
import GalleryWidget from "@/components/widgets/GalleryWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import type { WidgetConfig } from "@/types/widget";

const widgets: WidgetConfig[] = [
  {
    Icon: Icons.spotify,
    Type: SpotifyWidget,
    title: "Now Playing",
    size: "lg:col-span-1",
  },
  {
    Icon: Icons.gallery,
    Type: GalleryWidget,
    title: "Gallery",
    size: "lg:col-span-1",
  },
  {
    Icon: Icons.calendar,
    Type: CalendarWidget,
    title: "Calendar",
    size: "lg:col-span-1",
  },
];

export default function Home() {
  return (
    <div className="grid grid-cols-1 gap-8 text-slate-100 md:grid-cols-2 lg:grid-cols-3">
      {widgets.map((config, index) => (
        <Widget key={index} config={config} />
      ))}
    </div>
  );
}