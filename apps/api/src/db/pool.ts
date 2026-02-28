import { Pool } from "pg";

type CreatePoolConfig = {
  databaseUrl: string;
  databaseSsl: boolean;
  databaseSslRejectUnauthorized: boolean;
};

export function createPool(config: CreatePoolConfig): Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl
      ? {
          rejectUnauthorized: config.databaseSslRejectUnauthorized,
        }
      : false,
  });
}
