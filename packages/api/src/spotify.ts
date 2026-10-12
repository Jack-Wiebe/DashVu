import "server-only";
import { and, eq } from "drizzle-orm";
import SpotifyWebApi from "spotify-web-api-node";
import { accounts, db } from "@dashvu/db";

const clientId = process.env.AUTH_SPOTIFY_ID ?? process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.AUTH_SPOTIFY_SECRET ?? process.env.SPOTIFY_CLIENT_SECRET;

async function refreshAccessToken(refreshToken: string) {
  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials are not configured.");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Spotify token refresh failed (${response.status})`);
  }

  return (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
}

/**
 * Returns a Spotify client authenticated with a valid access token for the
 * user. Refreshing happens server-side and the rotated token is persisted in
 * the `account` row, so it is never exposed to the browser.
 */
export async function getSpotifyApiForUser(userId: string): Promise<SpotifyWebApi> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "spotify")))
    .limit(1);

  if (!account) {
    throw new Error("No Spotify account is linked to this user.");
  }

  let accessToken = account.access_token ?? undefined;
  const expiresAt = (account.expires_at ?? 0) * 1000;

  if (!accessToken || Date.now() >= expiresAt) {
    if (!account.refresh_token) {
      throw new Error("Spotify session expired. Please sign in again.");
    }

    const refreshed = await refreshAccessToken(account.refresh_token);
    accessToken = refreshed.access_token;

    await db
      .update(accounts)
      .set({
        access_token: refreshed.access_token,
        expires_at: Math.floor(Date.now() / 1000 + refreshed.expires_in),
        refresh_token: refreshed.refresh_token ?? account.refresh_token,
      })
      .where(
        and(
          eq(accounts.provider, account.provider),
          eq(accounts.providerAccountId, account.providerAccountId)
        )
      );
  }

  const api = new SpotifyWebApi({ clientId, clientSecret });
  api.setAccessToken(accessToken);
  if (account.refresh_token) api.setRefreshToken(account.refresh_token);
  return api;
}
