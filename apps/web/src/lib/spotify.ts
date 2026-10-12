import "server-only";
import SpotifyWebApi from "spotify-web-api-node";
import { env } from "@/env";

export const scopes = [
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
].join(",");

// Server-only client. Never import this module from a Client Component.
export const spotifyApi = new SpotifyWebApi({
  clientId: env.SPOTIFY_CLIENT_ID,
  clientSecret: env.SPOTIFY_CLIENT_SECRET,
});

export default spotifyApi;
