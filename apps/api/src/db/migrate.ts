import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const migrationFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const file of migrationFiles) {
    const existing = await pool.query<{ version: string }>(
      `SELECT version FROM schema_migrations WHERE version = $1 LIMIT 1`,
      [file],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = await fs.readFile(filePath, "utf8");

    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query(`INSERT INTO schema_migrations (version) VALUES ($1)`, [file]);
      await pool.query("COMMIT");
      console.log(`Applied migration: ${file}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw new Error(`Failed migration ${file}: ${(error as Error).message}`);
    }
  }
}

const isDirectExecution =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  const { loadEnv } = await import("../config/env.js");
  const { createPool } = await import("./pool.js");

  const env = loadEnv();
  if (!env.databaseEnabled || !env.databaseUrl) {
    throw new Error("Migrations require DATABASE_ENABLED=true and a valid DATABASE_URL");
  }

  const pool = createPool({
    databaseUrl: env.databaseUrl,
    databaseSsl: env.databaseSsl,
    databaseSslRejectUnauthorized: env.databaseSslRejectUnauthorized,
  });

  try {
    await runMigrations(pool);
    console.log("Migrations complete");
  } finally {
    await pool.end();
  }
}
