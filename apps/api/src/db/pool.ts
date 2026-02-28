import { Pool } from "pg";

export function createPool(databaseUrl: string, nodeEnv: string): Pool {
  return new Pool({
    connectionString: databaseUrl,
    ssl:
      nodeEnv === "production"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  });
}
