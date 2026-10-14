import { createLogger, type Logger } from "./logger";
import { resolveEntitlements, type Entitlements } from "./entitlements";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  hasSpotify?: boolean;
  hasCalendar?: boolean;
}

export interface Context {
  session: { user: SessionUser } | null;
  logger: Logger;
  entitlements: Entitlements;
}

export interface ContextInput {
  session?: Context["session"];
  logger?: Logger;
  entitlements?: Entitlements;
}

/** Builds a full request context, filling in the shared middleware services. */
export function createContext(input: ContextInput = {}): Context {
  const session = input.session ?? null;

  return {
    session,
    logger: input.logger ?? createLogger("trpc"),
    entitlements: input.entitlements ?? resolveEntitlements(session?.user?.id ?? null),
  };
}
