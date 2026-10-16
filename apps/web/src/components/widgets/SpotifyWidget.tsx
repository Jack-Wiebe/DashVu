"use client";

import { useEffect, useState } from "react";
import * as Progress from "@radix-ui/react-progress";
import {
  Check,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat1,
  Repeat2,
  Shuffle,
} from "lucide-react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { WidgetComponentProps } from "@/types/widget";

import { Button } from "../ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type RepeatState = "off" | "context" | "track";

const repeatNext: Record<RepeatState, RepeatState> = {
  off: "context",
  context: "track",
  track: "off",
};

function useNow(active: boolean, intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      setNow(Date.now());
      return;
    }
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

const SpotifyWidget: React.FC<WidgetComponentProps> = ({ className }) => {
  const { data: session, status } = useSession();
  const hasSpotify = Boolean(session?.user.hasSpotify);
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [playbackStarting, setPlaybackStarting] = useState(false);

  const playback = trpc.spotify.getPlaybackState.useQuery(undefined, {
    enabled: hasSpotify,
    refetchInterval: 10_000,
    retry: false,
  });

  const playlists = trpc.spotify.getPlaylists.useQuery(undefined, {
    enabled: hasSpotify,
    retry: false,
  });

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const refresh = () => void playback.refetch();
  const cancelPlayback = () => void utils.spotify.getPlaybackState.cancel();
  const patchPlayback = (patch: Partial<NonNullable<typeof playback.data>>) => {
    utils.spotify.getPlaybackState.setData(undefined, (old) => (old ? { ...old, ...patch } : old));
  };
  const retryUntil = async (isDone: (data: NonNullable<typeof playback.data>) => boolean) => {
    setPlaybackStarting(true);
    try {
      for (let attempt = 0; attempt < 6; attempt++) {
        await playback.refetch();
        const data = utils.spotify.getPlaybackState.getData();
        if (data && isDone(data)) return;
        await sleep(700);
      }
    } finally {
      setPlaybackStarting(false);
    }
  };
  const makeHandleResult =
    (refetchOnSuccess: boolean, retryUntilVisible = false, requirePlaying = false) =>
    (result: { ok: boolean; reason?: string } | undefined, error: unknown) => {
      if (error) {
        setPlaybackStarting(false);
        refresh();
        toast({
          title: "Spotify",
          description: "Control failed.",
          variant: "destructive",
        });
      } else if (result && !result.ok) {
        setPlaybackStarting(false);
        refresh();
        toast({
          title: "Spotify",
          description: result.reason ?? "Control failed.",
          variant: "destructive",
        });
      } else if (!playback.data?.item) {
        if (retryUntilVisible) {
          void retryUntil((data) =>
            requirePlaying ? data.is_playing === true : Boolean(data.item)
          );
        } else if (refetchOnSuccess || !playback.data) {
          refresh();
        }
      } else if (refetchOnSuccess) {
        refresh();
      }
    };
  const play = trpc.spotify.play.useMutation({
    onMutate: () => {
      cancelPlayback();
      patchPlayback({ is_playing: true, timestamp: Date.now() });
    },
    onSettled: makeHandleResult(false, true, true),
  });
  const pause = trpc.spotify.pause.useMutation({
    onMutate: () => {
      cancelPlayback();
      patchPlayback({ is_playing: false, timestamp: Date.now() });
    },
    onSettled: makeHandleResult(false),
  });
  const next = trpc.spotify.next.useMutation({
    onMutate: cancelPlayback,
    onSettled: makeHandleResult(true, true),
  });
  const previous = trpc.spotify.previous.useMutation({
    onMutate: cancelPlayback,
    onSettled: makeHandleResult(true, true),
  });
  const playContext = trpc.spotify.playContext.useMutation({
    onMutate: cancelPlayback,
    onSettled: (result, error, variables) => {
      if (error) {
        setPlaybackStarting(false);
        refresh();
        toast({
          title: "Spotify",
          description: "Control failed.",
          variant: "destructive",
        });
        return;
      }
      if (result && !result.ok) {
        setPlaybackStarting(false);
        refresh();
        toast({
          title: "Spotify",
          description: result.reason ?? "Control failed.",
          variant: "destructive",
        });
        return;
      }
      void retryUntil((data) => data.is_playing === true && data.context_uri === variables.uri);
    },
  });
  const shuffle = trpc.spotify.setShuffle.useMutation({
    onMutate: ({ state }) => {
      cancelPlayback();
      patchPlayback({ shuffle_state: state });
    },
    onSettled: makeHandleResult(false),
  });
  const repeat = trpc.spotify.setRepeat.useMutation({
    onMutate: ({ state }) => {
      cancelPlayback();
      patchPlayback({ repeat_state: state });
    },
    onSettled: makeHandleResult(false),
  });

  const dataIsPlaying = playback.data?.is_playing ?? false;
  const now = useNow(dataIsPlaying);

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
  const progressAnchorMs = playback.data?.timestamp ?? playback.dataUpdatedAt;
  const progressMs =
    playback.data && playback.data.progress_ms != null
      ? playback.data.progress_ms + (isPlaying ? Math.max(0, now - progressAnchorMs) : 0)
      : 0;
  const progress =
    track && track.duration_ms > 0
      ? Math.min(100, (Math.min(progressMs, track.duration_ms) / track.duration_ms) * 100)
      : 0;
  const albumImages = track && "album" in track ? track.album.images : [];
  const artists =
    track && "artists" in track ? track.artists.map((artist) => artist.name).join(", ") : "";
  const trackContextName = playback.data?.context?.name ?? null;
  const currentContextUri = playback.data?.context_uri ?? playback.data?.context?.uri ?? null;
  const shuffleState = playback.data?.shuffle_state ?? false;
  const repeatState = playback.data?.repeat_state ?? "off";

  return (
    <div className={cn(className, "flex flex-col gap-4 text-sm")}>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-clip">
        <div className="absolute left-0 top-0">
          {session?.user.image ? (
            <Image
              className="h-7 w-7 rounded-full"
              src={session.user.image}
              alt={session.user.name ?? "User avatar"}
              width={28}
              height={28}
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted" />
          )}
        </div>

        <div className="mt-6 shrink-0">
          {albumImages[1]?.url ? (
            <Image
              className="h-auto w-40 rounded-md"
              src={albumImages[1].url}
              alt={track?.name ?? "Album cover"}
              width={160}
              height={160}
            />
          ) : (
            <div className="h-40 w-40 rounded bg-muted" />
          )}
        </div>

        {playbackStarting ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/80" />
          </div>
        ) : null}

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="absolute right-0 top-0 flex max-w-[45%] items-center gap-1.5 overflow-clip rounded px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
            >
              <ListMusic className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{trackContextName ?? "Playlists"}</span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-72 w-56 overflow-y-auto" align="end">
            <DropdownMenuLabel>Playlists</DropdownMenuLabel>
            {playlists.isLoading ? (
              <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
            ) : playlists.error ? (
              <DropdownMenuItem disabled>Failed to load playlists.</DropdownMenuItem>
            ) : (
              playlists.data?.map((playlist) => (
                <DropdownMenuItem
                  key={playlist.uri}
                  onClick={() => {
                    if (playlist.uri === currentContextUri) return;
                    playContext.mutate({ uri: playlist.uri });
                  }}
                >
                  {playlist.imageUrl ? (
                    <Image
                      src={playlist.imageUrl}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 shrink-0 rounded-sm"
                    />
                  ) : (
                    <div className="h-5 w-5 shrink-0 rounded-sm bg-muted" />
                  )}
                  <span className="truncate">{playlist.name}</span>
                  {playlist.uri === currentContextUri ? (
                    <Check className="ml-auto h-4 w-4 shrink-0" />
                  ) : null}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div id="Track Info" className="flex shrink-0 flex-col items-center gap-1 text-center">
        <p className="max-w-full truncate">{track?.name ?? "Nothing playing"}</p>
        {artists ? (
          <p className="max-w-full truncate text-xs text-muted-foreground">{artists}</p>
        ) : null}

        <Progress.Root
          value={progress}
          className="mt-1 h-2 w-10/12 overflow-hidden rounded-full bg-black"
        >
          <Progress.Indicator
            className="h-full w-full bg-white"
            style={{ transform: `translateX(-${100 - progress}%)` }}
          />
        </Progress.Root>
      </div>

      <div id="buttons" className="flex shrink-0 items-center justify-evenly gap-1">
        <Button
          className="max-w-12"
          onClick={() => shuffle.mutate({ state: !shuffleState })}
          disabled={shuffle.isPending}
          aria-label="Toggle shuffle"
        >
          <Shuffle className={shuffleState ? "text-white" : "text-muted-foreground"} />
        </Button>
        <Button
          className="max-w-12"
          onClick={() => previous.mutate()}
          disabled={previous.isPending}
        >
          <ChevronFirst />
        </Button>
        <Button
          className="max-w-12"
          onClick={() => (isPlaying ? pause.mutate() : play.mutate())}
          disabled={play.isPending || pause.isPending}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <Button className="max-w-12" onClick={() => next.mutate()} disabled={next.isPending}>
          <ChevronLast />
        </Button>
        <Button
          className="max-w-12"
          onClick={() => repeat.mutate({ state: repeatNext[repeatState] })}
          disabled={repeat.isPending}
          aria-label="Toggle repeat"
        >
          {repeatState === "track" ? (
            <Repeat1 className="text-white" />
          ) : (
            <Repeat2
              className={repeatState === "context" ? "text-white" : "text-muted-foreground"}
            />
          )}
        </Button>
      </div>
    </div>
  );
};

export default SpotifyWidget;
