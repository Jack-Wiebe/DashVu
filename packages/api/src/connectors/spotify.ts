import "server-only";
import type SpotifyWebApi from "spotify-web-api-node";
import type { Connector, ConnectorDefinition } from "@dashvu/core";

import { getSpotifyApiForUser } from "../spotify";

const definition: ConnectorDefinition = {
  id: "spotify",
  authKind: "oauth",
  capabilities: ["nowPlaying", "control", "search"],
  cacheTtlMs: 0,
};

/** Resolves the authenticated Spotify client; routers use the returned handle. */
export const spotifyConnector: Connector<void, SpotifyWebApi> = {
  definition,
  async invoke(userId) {
    if (!userId) throw new Error("Spotify requires an authenticated user.");
    return getSpotifyApiForUser(userId);
  },
};
