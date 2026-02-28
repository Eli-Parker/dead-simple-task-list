export type Env = {
  databaseUrl: string;
  nodeEnv: string;
  port: number;
  databaseSsl: boolean;
  databaseSslRejectUnauthorized: boolean;
};

export function loadEnv(): Env {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const nodeEnv = process.env.NODE_ENV ?? "development";
  const port = Number(process.env.PORT || 4000);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return {
    databaseUrl,
    nodeEnv,
    port,
    databaseSsl: parseBoolean(process.env.DATABASE_SSL, nodeEnv === "production"),
    databaseSslRejectUnauthorized: parseBoolean(
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,
      true,
    ),
  };
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: "${value}"`);
}
