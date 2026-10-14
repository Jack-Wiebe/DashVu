import { eq } from "drizzle-orm";
import { z } from "zod";
import SpotifyWebApi from "spotify-web-api-node";
import { db, userPreferences } from "@dashvu/db";
import { getConnector } from "../connectors/registry";
import { protectedProcedure, router } from "../trpc";

type PlaybackContextInfo = { type: string; name: string } | null;

const getApi = (userId: string) => getConnector("spotify").invoke(userId, undefined);

async function resolveContextName(
  api: SpotifyWebApi,
  context: { uri?: string | null } | null | undefined
): Promise<PlaybackContextInfo> {
  const match = context?.uri?.match(/^spotify:([^:]+):(.+)$/);
  if (!match) return null;
  const [, type, id] = match;
  try {
    const name =
      type === "playlist"
        ? (await api.getPlaylist(id)).body.name
        : type === "album"
          ? (await api.getAlbum(id)).body.name
          : type === "artist"
            ? (await api.getArtist(id)).body.name
            : null;
    return name === null ? null : { type, name };
  } catch {
    return null;
  }
}

async function rememberActiveDevice(userId: string, deviceId: string | null) {
  if (!deviceId) return;
  try {
    await db
      .insert(userPreferences)
      .values({ userId, lastActiveDeviceId: deviceId })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { lastActiveDeviceId: deviceId },
      });
  } catch {
    return;
  }
}

async function getKnownDeviceId(api: SpotifyWebApi, userId: string): Promise<string | null> {
  try {
    const [prefs] = await db
      .select({ lastActiveDeviceId: userPreferences.lastActiveDeviceId })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (prefs?.lastActiveDeviceId) return prefs.lastActiveDeviceId;
  } catch {
    return null;
  }

  try {
    const { body } = await api.getMyDevices();
    return body.devices.find((device) => device.id)?.id ?? null;
  } catch {
    return null;
  }
}

async function attemptResume(api: SpotifyWebApi, userId: string): Promise<boolean> {
  const deviceId = await getKnownDeviceId(api, userId);
  if (!deviceId) return false;
  try {
    await api.transferMyPlayback([deviceId], { play: true });
    const { body } = await api.getMyCurrentPlaybackState();
    return Boolean(body?.device?.is_active);
  } catch {
    return false;
  }
}

type ControlResult = { ok: boolean; reason?: string };

function spotifyErrorReason(e: unknown): string | null {
  return (e as { body?: { error?: { reason?: string } } })?.body?.error?.reason ?? null;
}

export const spotifyRouter = router({
  getPlaybackState: protectedProcedure.query(async ({ ctx }) => {
    const api = await getApi(ctx.session.user.id);
    const { body } = await api.getMyCurrentPlaybackState();

    if (body) {
      await rememberActiveDevice(
        ctx.session.user.id,
        body.device?.is_active ? body.device.id : null
      );
    }

    if (!body) return null;
    const context = await resolveContextName(api, body.context);
    const raw = body as typeof body & {
      shuffle_state?: boolean;
      repeat_state?: "off" | "context" | "track";
    };
    return {
      ...body,
      context,
      context_uri: body.context?.uri ?? null,
      shuffle_state: raw.shuffle_state ?? false,
      repeat_state: raw.repeat_state ?? "off",
    } as typeof body & {
      context: PlaybackContextInfo;
      context_uri: string | null;
      shuffle_state: boolean;
      repeat_state: "off" | "context" | "track";
    };
  }),

  getPlaylists: protectedProcedure.query(async ({ ctx }) => {
    const api = await getApi(ctx.session.user.id);
    const { body } = await api.getUserPlaylists({ limit: 50 });
    return body.items.map((playlist) => ({
      uri: playlist.uri,
      name: playlist.name,
      imageUrl: playlist.images?.[0]?.url ?? null,
    }));
  }),

  playContext: protectedProcedure
    .input(z.object({ uri: z.string().min(1) }))
    .mutation(async ({ ctx, input }): Promise<ControlResult> => {
      const api = await getApi(ctx.session.user.id);
      const start = () => api.play({ context_uri: input.uri });
      try {
        await start();
        return { ok: true };
      } catch (error) {
        if (
          spotifyErrorReason(error) === "NO_ACTIVE_DEVICE" &&
          (await attemptResume(api, ctx.session.user.id))
        ) {
          try {
            await start();
            return { ok: true };
          } catch (resumeError) {
            return {
              ok: false,
              reason: spotifyErrorReason(resumeError) ?? "Unable to start playlist.",
            };
          }
        }
        return {
          ok: false,
          reason: spotifyErrorReason(error) ?? "Unable to start playlist.",
        };
      }
    }),

  setShuffle: protectedProcedure
    .input(z.object({ state: z.boolean() }))
    .mutation(async ({ ctx, input }): Promise<ControlResult> => {
      const api = await getApi(ctx.session.user.id);
      try {
        await api.setShuffle(input.state);
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: spotifyErrorReason(error) ?? "Unable to toggle shuffle." };
      }
    }),

  setRepeat: protectedProcedure
    .input(z.object({ state: z.enum(["off", "context", "track"]) }))
    .mutation(async ({ ctx, input }): Promise<ControlResult> => {
      const api = await getApi(ctx.session.user.id);
      try {
        await api.setRepeat(input.state);
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: spotifyErrorReason(error) ?? "Unable to toggle repeat." };
      }
    }),

  getDevices: protectedProcedure.query(async ({ ctx }) => {
    const api = await getApi(ctx.session.user.id);
    const { body } = await api.getMyDevices();
    return body.devices;
  }),

  play: protectedProcedure.mutation(async ({ ctx }): Promise<ControlResult> => {
    const api = await getApi(ctx.session.user.id);
    try {
      await api.play();
      return { ok: true };
    } catch (error) {
      if (
        spotifyErrorReason(error) === "NO_ACTIVE_DEVICE" &&
        (await attemptResume(api, ctx.session.user.id))
      ) {
        return { ok: true };
      }
      return {
        ok: false,
        reason: spotifyErrorReason(error) ?? "No active device. Open Spotify on a device first.",
      };
    }
  }),

  pause: protectedProcedure.mutation(async ({ ctx }): Promise<ControlResult> => {
    const api = await getApi(ctx.session.user.id);
    try {
      await api.pause();
      return { ok: true };
    } catch (error) {
      if (spotifyErrorReason(error) === "NO_ACTIVE_DEVICE") return { ok: true };
      const { body } = await api.getMyCurrentPlaybackState().catch(() => ({ body: undefined }));
      return body && !body.is_playing
        ? { ok: true }
        : { ok: false, reason: spotifyErrorReason(error) ?? "Unable to pause playback." };
    }
  }),

  next: protectedProcedure.mutation(async ({ ctx }): Promise<ControlResult> => {
    const api = await getApi(ctx.session.user.id);
    try {
      await api.skipToNext();
      return { ok: true };
    } catch (error) {
      return spotifyErrorReason(error) === "NO_ACTIVE_DEVICE"
        ? { ok: true }
        : { ok: false, reason: spotifyErrorReason(error) ?? "Unable to skip to next." };
    }
  }),

  previous: protectedProcedure.mutation(async ({ ctx }): Promise<ControlResult> => {
    const api = await getApi(ctx.session.user.id);
    try {
      await api.skipToPrevious();
      return { ok: true };
    } catch (error) {
      return spotifyErrorReason(error) === "NO_ACTIVE_DEVICE"
        ? { ok: true }
        : { ok: false, reason: spotifyErrorReason(error) ?? "Unable to skip to previous." };
    }
  }),

  transferPlayback: protectedProcedure
    .input(z.object({ deviceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const api = await getApi(ctx.session.user.id);
      await api.transferMyPlayback([input.deviceId]);
      return { ok: true } as const;
    }),
});
