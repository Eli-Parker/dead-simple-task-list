import type { QueryResultRow } from "pg";
import type { GraphQLContext } from "../graphql/context.js";

export async function queryRows<TRow extends QueryResultRow>(
  ctx: GraphQLContext,
  sql: string,
  params: unknown[] = [],
): Promise<TRow[]> {
  const result = await ctx.pool.query<TRow>(sql, params);
  return result.rows;
}
