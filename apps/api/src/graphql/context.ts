import type { Pool } from "pg";

export type GraphQLContext = {
  pool: Pool | null;
};

export function buildContext(pool: Pool | null): GraphQLContext {
  return { pool };
}
