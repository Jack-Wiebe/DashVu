"use client";

import { Icons } from "@/components/Icons";
import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { useSession } from "next-auth/react";
import WidgetProps from "@/types/widget";
import Widget from "@/components/Widget";
import SpotifyWidget from "@/components/widgets/SpotifyWidget";
import GalleryWidget from "@/components/widgets/GalleryWidget";

export default function Home() {
  const { data: session, status: test } = useSession();

  const props1: WidgetProps = {
    size: "text-red",
    Icon: Icons.spotify,
    Type: SpotifyWidget,
  };
  const props2: WidgetProps = {
    size: "text-red",
    Icon: Icons.gallery,
    Type: GalleryWidget,
  };
  const props3: WidgetProps = {
    size: "text-red",
    Icon: Icons.calendar,
    Type: "calendar",
  };

  return (
    <div className="text-slate-100 grid gap-8 lg:grid-cols-3 md:grid-cols-2 sml:grid-cols-1">
      <Widget props={props1}></Widget>
      <Widget props={props2}></Widget>
      <Widget props={props3}></Widget>
    </div>
  );
}
