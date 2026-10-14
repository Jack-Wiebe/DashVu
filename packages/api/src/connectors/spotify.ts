import "server-only";
import type SpotifyWebApi from "spotify-web-api-node";
import type { Connector, ConnectorDefinition } from "@dashvu/core";

import { getAuthedClient } from "../credentials";

const definition: ConnectorDefinition = {
  id: "spotify",
  authKind: "oauth",
  scopes: ["user-read-playback-state", "user-modify-playback-state"],
  capabilities: ["nowPlaying", "control", "search"],
  cacheTtlMs: 0,
  ratePolicy: { points: 180, windowMs: 30 * 1000, scope: "user" },
};

/** Resolves the authenticated Spotify client; routers use the returned handle. */
export const spotifyConnector: Connector<void, SpotifyWebApi> = {
  definition,
  async invoke(userId) {
    if (!userId) throw new Error("Spotify requires an authenticated user.");
    const { client } = await getAuthedClient(userId, "spotify");
    return client;
  },
};
