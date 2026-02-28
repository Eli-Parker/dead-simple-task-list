export type Env = {
  databaseEnabled: boolean;
  databaseUrl: string | null;
  nodeEnv: string;
  port: number;
  databaseSsl: boolean;
  databaseSslRejectUnauthorized: boolean;
};

export function loadEnv(): Env {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const port = Number(process.env.PORT || 4000);
  const databaseEnabled = parseBoolean(process.env.DATABASE_ENABLED, true);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseEnabled) {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required when DATABASE_ENABLED=true");
    }

    assertDatabaseUrl(databaseUrl);
  }

  return {
    databaseEnabled,
    databaseUrl: databaseEnabled ? (databaseUrl as string) : null,
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

function assertDatabaseUrl(databaseUrl: string): void {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid URL");
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must start with postgres:// or postgresql://");
  }
}
