import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { DateTimeScalar } from "./scalars/date-time.scalar.js";

// Defines the tables and their columns
const typeDefs = `#graphql
  scalar DateTime

  type Board {
    id: ID!
    link_token: String!
    title: String!
    created_at: DateTime!
    updated_at: DateTime!
  }

  type Query {
    health: String!
  }
  
`;

// Resolver behavior for queries
const resolvers = {
  DateTime: DateTimeScalar.scalar,
  Query: {
    health: () => "ok",
  },
};

async function main() {
  // Start server
  const server = new ApolloServer({ typeDefs, resolvers });

  const port = Number(process.env.PORT || 4000); // Railway injects PORT
  const { url } = await startStandaloneServer(server, {
    listen: { port, host: "0.0.0.0" },
  });

  console.log(`GraphQL running at ${url}`);
}

// Handle errors
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
