import SpotifyWebApi from "spotify-web-api-node";

let client: SpotifyWebApi | undefined;

/**
 * Client-safe Spotify instance. Holds only a user access token; the
 * client secret is never available in the browser. Refresh of the token is
 * handled server-side by the NextAuth callbacks.
 */
export const getSpotifyClient = (accessToken?: string | null) => {
  if (!client) {
    client = new SpotifyWebApi();
  }
  if (accessToken) {
    client.setAccessToken(accessToken);
  }
  return client;
};
