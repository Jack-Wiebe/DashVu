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
    async session({ session, user }) {
      session.user.id = user.id;

      const linked = await db
        .select({ provider: accounts.provider })
        .from(accounts)
        .where(and(eq(accounts.userId, user.id), eq(accounts.provider, "spotify")))
        .limit(1);

      session.user.hasSpotify = linked.length > 0;
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
