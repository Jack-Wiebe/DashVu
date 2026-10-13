import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Spotify from "next-auth/providers/spotify";

import { accounts, db, sessions, users, verificationTokens } from "@dashvu/db";
import { env } from "@/env";

const spotifyScopes = [
  "user-read-email",
  "user-read-private",
  "playlist-read-collaborative",
  "streaming",
  "user-library-read",
  "user-top-read",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-follow-read",
].join(" ");

const googleScopes = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

const calendarScope = "https://www.googleapis.com/auth/calendar";

export const authConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
        params: {
          scope: googleScopes,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    Spotify({
      clientId: env.AUTH_SPOTIFY_ID,
      clientSecret: env.AUTH_SPOTIFY_SECRET,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: { scope: spotifyScopes },
      },
    }),
  ],
  secret: env.AUTH_SECRET,
  session: { strategy: "database" },
  basePath: "/api/auth",
  pages: { signIn: "/sign-in" },
  trustHost: true,
  callbacks: {
    async signIn({ user, account }) {
      // Auth.js does not update tokens for an already-linked account. When a
      // signed-in user re-consents with Google (e.g. to grant Calendar access),
      // persist the refreshed tokens/scope so `hasCalendar` stays in sync.
      if (account?.provider === "google" && account.access_token && user?.id) {
        await db
          .update(accounts)
          .set({
            access_token: account.access_token,
            refresh_token: account.refresh_token ?? undefined,
            expires_at: account.expires_at ?? undefined,
            scope: account.scope ?? undefined,
            token_type: account.token_type ?? undefined,
            id_token: account.id_token ?? undefined,
          })
          .where(
            and(
              eq(accounts.provider, account.provider),
              eq(accounts.providerAccountId, account.providerAccountId)
            )
          );
      }

      return true;
    },
    async session({ session, user }) {
      session.user.id = user.id;

      const linked = await db
        .select({ provider: accounts.provider, scope: accounts.scope })
        .from(accounts)
        .where(eq(accounts.userId, user.id));

      session.user.hasSpotify = linked.some((account) => account.provider === "spotify");
      session.user.hasCalendar = linked.some(
        (account) =>
          account.provider === "google" &&
          Boolean(account.scope?.split(" ").some((value) => value.startsWith(calendarScope)))
      );

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
