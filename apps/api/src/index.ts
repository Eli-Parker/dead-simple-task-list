import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { loadEnv } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";
import { createPool } from "./db/pool.js";
import { buildContext } from "./graphql/context.js";
import { resolvers } from "./graphql/resolvers/index.js";
import { typeDefs } from "./graphql/type-defs.js";

async function main() {
  const env = loadEnv();
  const pool = createPool({
    databaseUrl: env.databaseUrl,
    databaseSsl: env.databaseSsl,
    databaseSslRejectUnauthorized: env.databaseSslRejectUnauthorized,
  });
  await runMigrations(pool);

  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await startStandaloneServer(server, {
    context: async () => buildContext(pool),
    listen: { port: env.port, host: "0.0.0.0" },
  });

  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    console.log(`Received ${signal}, shutting down...`);
    await server.stop();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`GraphQL running at ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
