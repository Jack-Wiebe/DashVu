import "server-only";
import type SpotifyWebApi from "spotify-web-api-node";
import type { calendar_v3 } from "@googleapis/calendar";
import type { AuthKind } from "@dashvu/core";

import { getCalendarClientForUser } from "./google";
import { getSpotifyApiForUser } from "./spotify";

export interface AuthedClient<C = unknown> {
  provider: string;
  kind: AuthKind;
  client: C;
}

/**
 * Single entry point for obtaining a provider client. OAuth providers refresh
 * server-side (tokens persist in the `account` table); keyless providers need
 * no client; API-key providers will read the encrypted credential store once
 * the first such connector ships.
 */
export async function getAuthedClient(
  userId: string,
  provider: "spotify"
): Promise<AuthedClient<SpotifyWebApi>>;
export async function getAuthedClient(
  userId: string,
  provider: "google"
): Promise<AuthedClient<calendar_v3.Calendar>>;
export async function getAuthedClient(
  userId: string | null,
  provider: string
): Promise<AuthedClient>;
export async function getAuthedClient(
  userId: string | null,
  provider: string
): Promise<AuthedClient> {
  switch (provider) {
    case "spotify": {
      if (!userId) throw new Error("Spotify requires an authenticated user.");
      return { provider, kind: "oauth", client: await getSpotifyApiForUser(userId) };
    }
    case "google": {
      if (!userId) throw new Error("Google requires an authenticated user.");
      return { provider, kind: "oauth", client: await getCalendarClientForUser(userId) };
    }
    case "openMeteo":
    case "openMeteoGeocoding":
      return { provider, kind: "keyless", client: null };
    default:
      throw new Error(`Unknown connector provider: ${provider}`);
  }
}
