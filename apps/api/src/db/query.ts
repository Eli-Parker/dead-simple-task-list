import type { QueryResultRow } from "pg";
import type { GraphQLContext } from "../graphql/context.js";

export async function queryRows<TRow extends QueryResultRow>(
  ctx: GraphQLContext,
  sql: string,
  params: unknown[] = [],
): Promise<TRow[]> {
  if (!ctx.pool) {
    throw new Error("Database is disabled. Set DATABASE_ENABLED=true to execute queries.");
  }

  const result = await ctx.pool.query<TRow>(sql, params);
  return result.rows;
}
