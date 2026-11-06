"use client";

import { useEffect, useRef, useState } from "react";
import * as Progress from "@radix-ui/react-progress";
import {
  Car,
  Check,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ListMusic,
  Loader2,
  Monitor,
  MonitorSmartphone,
  Pause,
  Play,
  Repeat1,
  Repeat2,
  Shuffle,
  Smartphone,
  Speaker,
  Tv,
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

function DeviceIcon({ type }: { type: string | undefined }) {
  const kind = type?.toLowerCase();
  const Icon =
    kind === "computer"
      ? Monitor
      : kind === "smartphone" || kind === "tablet"
        ? Smartphone
        : kind === "speaker" || kind === "castaudio" || kind === "audiodongle"
          ? Speaker
          : kind === "tv"
            ? Tv
            : kind === "automobile"
              ? Car
              : MonitorSmartphone;
  return <Icon className="h-4 w-4 shrink-0" />;
}

function formatDeviceError(reason: string | null) {
  if (!reason) return null;
  if (reason === "NO_ACTIVE_DEVICE") {
    return "No active device. Open Spotify on a device first.";
  }
  if (reason === "PREMIUM_REQUIRED") {
    return "Spotify Premium is required to switch devices.";
  }
  return reason;
}

function getInterpolatedProgressMs(
  data: { progress_ms?: number | null; is_playing?: boolean } | null | undefined,
  anchorMs: number,
  nowMs: number
): number {
  if (!data || data.progress_ms == null) return 0;
  return data.progress_ms + (data.is_playing ? Math.max(0, nowMs - anchorMs) : 0);
}

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
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const playback = trpc.spotify.getPlaybackState.useQuery(undefined, {
    enabled: hasSpotify,
    refetchInterval: devicesOpen ? 5_000 : 10_000,
    retry: false,
  });

  const playlists = trpc.spotify.getPlaylists.useQuery(undefined, {
    enabled: hasSpotify,
    retry: false,
  });

  const devices = trpc.spotify.getDevices.useQuery(undefined, {
    enabled: hasSpotify && devicesOpen,
    staleTime: 0,
    retry: false,
    refetchInterval: devicesOpen ? 5_000 : false,
  });

  const dataIsPlaying = playback.data?.is_playing ?? false;
  const now = useNow(dataIsPlaying);
  const progressMs = getInterpolatedProgressMs(playback.data, playback.dataUpdatedAt, now);
  const progressMsRef = useRef(progressMs);
  progressMsRef.current = progressMs;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const refresh = () => void playback.refetch();
  const cancelPlayback = () => void utils.spotify.getPlaybackState.cancel();
  const patchPlayback = (patch: Partial<NonNullable<typeof playback.data>>) => {
    const progress_ms = Math.round(progressMsRef.current);
    utils.spotify.getPlaybackState.setData(undefined, (old) =>
      old ? { ...old, ...patch, progress_ms } : old
    );
  };
  const retryUntil = async (
    isDone: (data: NonNullable<typeof playback.data>) => boolean,
    attempts = 6
  ) => {
    setPlaybackStarting(true);
    try {
      for (let attempt = 0; attempt < attempts; attempt++) {
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
      patchPlayback({ is_playing: true });
    },
    onSettled: makeHandleResult(false, true, true),
  });
  const pause = trpc.spotify.pause.useMutation({
    onMutate: () => {
      cancelPlayback();
      patchPlayback({ is_playing: false });
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
  const transferPlayback = trpc.spotify.transferPlayback.useMutation({
    onMutate: () => setDeviceError(null),
    onSuccess: (result, variables) => {
      if (!result.ok) {
        setDeviceError(result.reason ?? "Unable to switch device.");
        refresh();
        return;
      }
      setDevicesOpen(false);
      const shouldPlay = result.playing ?? variables.play ?? false;
      void retryUntil(
        (data) => data.device?.id === variables.deviceId && data.is_playing === shouldPlay,
        8
      );
    },
    onError: () => {
      setDeviceError("Unable to switch device.");
      refresh();
    },
  });
  const handleDevicesOpenChange = (open: boolean) => {
    setDevicesOpen(open);
    if (open) {
      setDeviceError(null);
      transferPlayback.reset();
      refresh();
    }
  };

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
    track && track.duration_ms > 0
      ? Math.min(100, (Math.min(progressMs, track.duration_ms) / track.duration_ms) * 100)
      : 0;
  const images =
    track && "images" in track ? track.images : track && "album" in track ? track.album.images : [];
  const artworkUrl = images[1]?.url ?? images[0]?.url ?? null;
  const subtitle =
    track && "show" in track
      ? track.show.name
      : track && "artists" in track
        ? track.artists.map((artist) => artist.name).join(", ")
        : "";
  const trackContextName = playback.data?.context?.name ?? null;
  const currentContextUri = playback.data?.context_uri ?? playback.data?.context?.uri ?? null;
  const shuffleState = playback.data?.shuffle_state ?? false;
  const repeatState = playback.data?.repeat_state ?? "off";
  const activeDevice = devicesOpen
    ? (devices.data?.find((device) => device.is_active && device.id) ??
      playback.data?.device ??
      null)
    : (playback.data?.device ?? null);
  const activeDeviceId = activeDevice?.id ?? null;
  const activeDeviceName = activeDevice?.name ?? null;
  const deviceErrorMessage = formatDeviceError(deviceError);
  const devicesList = (devices.data ?? [])
    .flatMap((device) => (device.id ? [{ ...device, id: device.id }] : []))
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name));

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
          {artworkUrl ? (
            <Image
              className="h-auto w-40 rounded-md"
              src={artworkUrl}
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

        <div className="absolute right-0 top-0 flex max-w-[60%] items-center justify-end gap-1">
          <DropdownMenu modal={false} open={devicesOpen} onOpenChange={handleDevicesOpenChange}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus:outline-none",
                  !activeDeviceId && "text-amber-500 hover:text-amber-400"
                )}
                aria-label={
                  activeDeviceName ? `Select device (${activeDeviceName})` : "Select Spotify device"
                }
                title={activeDeviceName ? `Device: ${activeDeviceName}` : "No active device"}
              >
                {transferPlayback.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MonitorSmartphone className="h-3.5 w-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-72 w-60 overflow-y-auto" align="end">
              <DropdownMenuLabel>Devices</DropdownMenuLabel>
              {!activeDeviceId ? (
                <p className="px-2 pb-1.5 text-xs text-muted-foreground">
                  No active device. Open Spotify on a device or pick one below.
                </p>
              ) : null}
              {deviceErrorMessage ? (
                <p className="px-2 pb-1.5 text-xs text-destructive">{deviceErrorMessage}</p>
              ) : null}
              {devices.isLoading ? (
                <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
              ) : devices.error ? (
                <DropdownMenuItem disabled>Failed to load devices.</DropdownMenuItem>
              ) : devicesList.length === 0 ? (
                <DropdownMenuItem disabled>
                  No devices found. Open Spotify on a device.
                </DropdownMenuItem>
              ) : (
                devicesList.map((device) => {
                  const isActive = device.id === activeDeviceId;
                  const isSwitching =
                    transferPlayback.isPending &&
                    transferPlayback.variables?.deviceId === device.id;
                  return (
                    <DropdownMenuItem
                      key={device.id}
                      disabled={isActive || transferPlayback.isPending || device.is_restricted}
                      onSelect={(event) => {
                        event.preventDefault();
                        transferPlayback.mutate({
                          deviceId: device.id,
                          play: playback.data?.is_playing ?? false,
                        });
                      }}
                    >
                      <DeviceIcon type={device.type} />
                      <span className="truncate">{device.name}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {device.is_restricted ? "Restricted" : device.type}
                      </span>
                      {isSwitching ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : isActive ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })
              )}
              {devices.error ? (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void devices.refetch();
                  }}
                >
                  Retry
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 items-center gap-1.5 overflow-clip rounded px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
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
      </div>

      <div id="Track Info" className="flex shrink-0 flex-col items-center gap-1 text-center">
        <p className="max-w-full truncate">{track?.name ?? "Nothing playing"}</p>
        {subtitle ? (
          <p className="max-w-full truncate text-xs text-muted-foreground">{subtitle}</p>
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
