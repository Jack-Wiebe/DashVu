import "server-only";
import { and, eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { calendar, calendar_v3 } from "@googleapis/calendar";
import { accounts, db } from "@dashvu/db";

const clientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

/**
 * Returns a Google Calendar client authenticated with a valid access token for
 * the user. Tokens refresh server-side and any rotated values are persisted in
 * the `account` row, so they are never exposed to the browser.
 */
export async function getCalendarClientForUser(userId: string): Promise<calendar_v3.Calendar> {
  if (!clientId || !clientSecret) {
    throw new Error("Google credentials are not configured.");
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
    .limit(1);

  if (!account) {
    throw new Error("No Google account is linked to this user.");
  }

  if (!account.refresh_token) {
    throw new Error("Google Calendar is not connected. Please sign in again.");
  }

  const oauth2Client = new OAuth2Client({ clientId, clientSecret });
  oauth2Client.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2Client.on("tokens", (tokens) => {
    void db
      .update(accounts)
      .set({
        access_token: tokens.access_token ?? account.access_token,
        expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : account.expires_at,
        refresh_token: tokens.refresh_token ?? account.refresh_token,
      })
      .where(
        and(
          eq(accounts.provider, account.provider),
          eq(accounts.providerAccountId, account.providerAccountId)
        )
      );
  });

  return calendar({ version: "v3", auth: oauth2Client });
}
