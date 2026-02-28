export type Env = {
  databaseUrl: string;
  nodeEnv: string;
  port: number;
};

export function loadEnv(): Env {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return {
    databaseUrl,
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT || 4000),
  };
}
