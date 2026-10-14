import { z } from "zod";

/**
 * Shared zod schemas for connector identifiers and configuration. These mirror
 * the pure `ConnectorDefinition` contract in `@dashvu/core` so payloads can be
 * validated at the boundary without pulling runtime code into `core`.
 */

export const connectorIdSchema = z.enum([
  "spotify",
  "google",
  "openMeteo",
  "openMeteoGeocoding",
  "rainViewer",
]);

export type ConnectorId = z.infer<typeof connectorIdSchema>;

export const authKindSchema = z.enum(["oauth", "apikey", "keyless"]);

export type AuthKind = z.infer<typeof authKindSchema>;

export const ratePolicySchema = z.object({
  points: z.number().int().positive(),
  windowMs: z.number().int().positive(),
  scope: z.enum(["provider", "user"]),
});

export type RatePolicy = z.infer<typeof ratePolicySchema>;

export const connectorDefinitionSchema = z.object({
  id: z.string().min(1),
  authKind: authKindSchema,
  scopes: z.array(z.string()).optional(),
  capabilities: z.array(z.string()),
  cacheTtlMs: z.number().int().min(0),
  ratePolicy: ratePolicySchema,
});

export type ConnectorDefinition = z.infer<typeof connectorDefinitionSchema>;
