import type { Pool } from "pg";

export type GraphQLContext = {
  pool: Pool;
};

export function buildContext(pool: Pool): GraphQLContext {
  return { pool };
}
