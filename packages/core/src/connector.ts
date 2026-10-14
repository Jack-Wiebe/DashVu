/**
 * Framework-agnostic connector contract.
 *
 * A connector describes how DashVu talks to an external (or in-house) data
 * source. These are pure types with no runtime dependencies so they can be
 * shared by both the client-facing manifest and the server-side
 * implementations in `@dashvu/api`.
 */

export type AuthKind = "oauth" | "apikey" | "keyless";

export interface RatePolicy {
  /** Number of requests allowed per window. */
  points: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface ConnectorDefinition {
  /** Stable identifier, also used as the credential/cache namespace. */
  id: string;
  authKind: AuthKind;
  /** Capability tags, e.g. `["nowPlaying", "control", "search"]`. */
  capabilities: string[];
  /** Default response cache lifetime in milliseconds. */
  cacheTtlMs: number;
  /** Only present on connectors whose `invoke` performs the outbound call. */
  ratePolicy?: RatePolicy;
}

/**
 * Server-side connector implementation. Lives in `@dashvu/api`; callers only
 * ever depend on this interface, never on a concrete provider.
 */
export interface Connector<Req = unknown, Res = unknown> {
  definition: ConnectorDefinition;
  /** userId is null for keyless connectors that need no per-user auth. */
  invoke(userId: string | null, req: Req): Promise<Res>;
}
