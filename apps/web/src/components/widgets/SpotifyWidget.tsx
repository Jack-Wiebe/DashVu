"use client";

import * as Progress from "@radix-ui/react-progress";
import { ChevronFirst, ChevronLast, Pause, Play, Repeat2, Shuffle } from "lucide-react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { WidgetComponentProps } from "@/types/widget";

import { Button } from "../ui/Button";

const SpotifyWidget: React.FC<WidgetComponentProps> = ({ className }) => {
  const { data: session, status } = useSession();
  const hasSpotify = Boolean(session?.user.hasSpotify);

  const playback = trpc.spotify.getPlaybackState.useQuery(undefined, {
    enabled: hasSpotify,
    refetchInterval: 10_000,
    retry: false,
  });

  const refresh = () => void playback.refetch();
  const play = trpc.spotify.play.useMutation({ onSuccess: refresh });
  const pause = trpc.spotify.pause.useMutation({ onSuccess: refresh });
  const next = trpc.spotify.next.useMutation({ onSuccess: refresh });
  const previous = trpc.spotify.previous.useMutation({ onSuccess: refresh });

  if (status === "loading") {
    return <div className={cn(className, "text-sm")}>Loading…</div>;
  }

  if (!hasSpotify) {
    return (
      <div className={cn(className, "flex flex-col items-center justify-center gap-2 text-sm")}>
        <p>Spotify is not connected.</p>
        <Button size="sm" onClick={() => signIn("spotify", { callbackUrl: "/" })}>
          Connect Spotify
        </Button>
      </div>
    );
  }

  const track = playback.data?.item ?? null;
  const isPlaying = playback.data?.is_playing ?? false;
  const progress =
    playback.data?.progress_ms && track ? (playback.data.progress_ms / track.duration_ms) * 100 : 0;
  const albumImages = track && "album" in track ? track.album.images : [];
  const artists =
    track && "artists" in track ? track.artists.map((artist) => artist.name).join(", ") : "";

  return (
    <div className={cn(className, "grid items-center grid-cols-1 grid-rows-5 text-sm gap-8")}>
      <div id="User Info" className="flex gap-2 items-center h-10 overflow-clip">
        {session?.user.image ? (
          <Image
            className="h-10 w-10 max-w-10"
            src={session.user.image}
            alt={session.user.name ?? "User avatar"}
            width={40}
            height={40}
          />
        ) : (
          <div className="h-10 w-10 max-w-10 rounded-full bg-zinc-800" />
        )}
        <div className="flex-1">{session?.user.name}</div>
      </div>

      <div id="Album Cover" className="flex justify-center row-span-2">
        {albumImages[1]?.url ? (
          <Image
            className="w-40 h-auto"
            src={albumImages[1].url}
            alt={track?.name ?? "Album cover"}
            width={160}
            height={160}
          />
        ) : (
          <div className="h-40 w-40 rounded bg-zinc-800" />
        )}
      </div>

      <div id="Track Info" className="flex flex-col items-center justify-evenly gap-2 text-center">
        <p>{track?.name ?? "Nothing playing"}</p>
        <p className="text-xs">{artists}</p>

        <Progress.Root
          value={progress}
          className="w-10/12 h-2 overflow-hidden bg-black rounded-full mt-1"
        >
          <Progress.Indicator
            className="bg-white w-full h-full"
            style={{ transform: `translateX(-${100 - progress}%)` }}
          />
        </Progress.Root>
      </div>

      <div id="buttons" className="flex items-center justify-evenly lg:gap-2 sm:gap-0">
        <Button className="sm:max-w-12" disabled>
          <Shuffle />
        </Button>
        <Button
          className="sm:max-w-12"
          onClick={() => previous.mutate()}
          disabled={previous.isPending}
        >
          <ChevronFirst />
        </Button>
        <Button
          className="sm:max-w-12"
          onClick={() => (isPlaying ? pause.mutate() : play.mutate())}
          disabled={play.isPending || pause.isPending}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <Button className="sm:max-w-12" onClick={() => next.mutate()} disabled={next.isPending}>
          <ChevronLast />
        </Button>
        <Button className="sm:max-w-12" disabled>
          <Repeat2 />
        </Button>
      </div>
    </div>
  );
};

export default SpotifyWidget;
