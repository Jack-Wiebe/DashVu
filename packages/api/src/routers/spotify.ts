import { z } from "zod";
import { getSpotifyApiForUser } from "../spotify";
import { protectedProcedure, router } from "../trpc";

export const spotifyRouter = router({
  getPlaybackState: protectedProcedure.query(async ({ ctx }) => {
    const api = await getSpotifyApiForUser(ctx.session.user.id);
    const { body } = await api.getMyCurrentPlaybackState();
    return body ?? null;
  }),

  getDevices: protectedProcedure.query(async ({ ctx }) => {
    const api = await getSpotifyApiForUser(ctx.session.user.id);
    const { body } = await api.getMyDevices();
    return body.devices;
  }),

  play: protectedProcedure.mutation(async ({ ctx }) => {
    const api = await getSpotifyApiForUser(ctx.session.user.id);
    await api.play();
    return { ok: true } as const;
  }),

  pause: protectedProcedure.mutation(async ({ ctx }) => {
    const api = await getSpotifyApiForUser(ctx.session.user.id);
    await api.pause();
    return { ok: true } as const;
  }),

  next: protectedProcedure.mutation(async ({ ctx }) => {
    const api = await getSpotifyApiForUser(ctx.session.user.id);
    await api.skipToNext();
    return { ok: true } as const;
  }),

  previous: protectedProcedure.mutation(async ({ ctx }) => {
    const api = await getSpotifyApiForUser(ctx.session.user.id);
    await api.skipToPrevious();
    return { ok: true } as const;
  }),

  transferPlayback: protectedProcedure
    .input(z.object({ deviceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const api = await getSpotifyApiForUser(ctx.session.user.id);
      await api.transferMyPlayback([input.deviceId]);
      return { ok: true } as const;
    }),
});
