import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = NeonHttpDatabase<typeof schema>;

/**
 * DATABASE_URL is required at runtime, but the app must still build without it
 * (e.g. CI, or before Neon is provisioned). The Drizzle Auth.js adapter does an
 * `instanceof PgDatabase` check, so `db` has to be a real client instance at
 * import time; a placeholder URL keeps construction side-effect free (no
 * connection is opened until the first query).
 */
const connectionString =
  process.env.DATABASE_URL ?? "postgres://user:password@127.0.0.1:5432/dashvu";

export const db: Database = drizzle(neon(connectionString), { schema });

export * from "./schema";
export { schema };
