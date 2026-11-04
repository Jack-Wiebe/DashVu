import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      hasSpotify?: boolean;
      hasCalendar?: boolean;
      hasTasks?: boolean;
    } & DefaultSession["user"];
  }
}
