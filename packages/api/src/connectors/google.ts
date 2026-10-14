import "server-only";
import type { calendar_v3 } from "@googleapis/calendar";
import type { Connector, ConnectorDefinition } from "@dashvu/core";

import { getAuthedClient } from "../credentials";

const definition: ConnectorDefinition = {
  id: "google",
  authKind: "oauth",
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  capabilities: ["calendarEvents"],
  cacheTtlMs: 0,
  ratePolicy: { points: 120, windowMs: 60 * 1000, scope: "user" },
};

/** Resolves the authenticated Google Calendar client; routers use the handle. */
export const googleConnector: Connector<void, calendar_v3.Calendar> = {
  definition,
  async invoke(userId) {
    if (!userId) throw new Error("Google requires an authenticated user.");
    const { client } = await getAuthedClient(userId, "google");
    return client;
  },
};
