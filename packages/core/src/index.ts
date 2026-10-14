/**
 * Framework-agnostic business logic (pure functions only).
 *
 * Pure helpers such as `apps/web/src/lib/filters.ts` will move here so they can
 * be unit tested without React/Next dependencies.
 */
export const CORE_PACKAGE = "@dashvu/core";

export type { AuthKind, RatePolicy, ConnectorDefinition, Connector } from "./connector";

export { describeWeatherCode } from "./weather";
