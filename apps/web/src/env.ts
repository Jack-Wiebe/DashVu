import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_SECRET: z.string().min(1),
    AUTH_URL: z.string().url().optional(),
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    AUTH_SPOTIFY_ID: z.string().min(1),
    AUTH_SPOTIFY_SECRET: z.string().min(1),
    DATABASE_URL: z.string().url().optional(),
    DASHVU_USER_AGENT: z.string().min(1).optional(),
  },
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
    AUTH_SPOTIFY_ID: process.env.AUTH_SPOTIFY_ID ?? process.env.SPOTIFY_CLIENT_ID,
    AUTH_SPOTIFY_SECRET: process.env.AUTH_SPOTIFY_SECRET ?? process.env.SPOTIFY_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    DASHVU_USER_AGENT: process.env.DASHVU_USER_AGENT,
  },
  emptyStringAsUndefined: true,
});
