import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { loadEnv } from "./config/env.js";
import { createPool } from "./db/pool.js";
import { buildContext } from "./graphql/context.js";
import { resolvers } from "./graphql/resolvers/index.js";
import { typeDefs } from "./graphql/type-defs.js";

async function main() {
  const env = loadEnv();
  const pool = createPool(env.databaseUrl, env.nodeEnv);

  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await startStandaloneServer(server, {
    context: async () => buildContext(pool),
    listen: { port: env.port, host: "0.0.0.0" },
  });

  console.log(`GraphQL running at ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
