import { z } from "zod";

/**
 * Shared zod schema for connector identifiers. Mirrors the `ConnectorId` union
 * used by the server-side registry in `@dashvu/api`.
 */

export const connectorIdSchema = z.enum([
  "spotify",
  "google",
  "openMeteo",
  "openMeteoGeocoding",
  "rainViewer",
]);

export type ConnectorId = z.infer<typeof connectorIdSchema>;
