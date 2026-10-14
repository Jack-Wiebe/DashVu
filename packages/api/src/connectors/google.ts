import "server-only";
import type { calendar_v3 } from "@googleapis/calendar";
import type { Connector, ConnectorDefinition } from "@dashvu/core";

import { getCalendarClientForUser } from "../google";

const definition: ConnectorDefinition = {
  id: "google",
  authKind: "oauth",
  capabilities: ["calendarEvents"],
  cacheTtlMs: 0,
};

/** Resolves the authenticated Google Calendar client; routers use the handle. */
export const googleConnector: Connector<void, calendar_v3.Calendar> = {
  definition,
  async invoke(userId) {
    if (!userId) throw new Error("Google requires an authenticated user.");
    return getCalendarClientForUser(userId);
  },
};
