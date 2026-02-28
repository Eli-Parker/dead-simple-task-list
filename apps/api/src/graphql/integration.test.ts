import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { ApolloServer } from "@apollo/server";
import type { Pool } from "pg";
import { createPool } from "../db/pool.js";
import { runMigrations } from "../db/migrate.js";
import { buildContext, type GraphQLContext } from "./context.js";
import { resolvers } from "./resolvers/index.js";
import { typeDefs } from "./type-defs.js";

const baseDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!baseDatabaseUrl) {
  test("GraphQL integration tests require TEST_DATABASE_URL", {
    skip: true,
  });
} else {
  describe("GraphQL integration", () => {
    let adminPool: Pool;
    let appPool: Pool;
    let server: ApolloServer<GraphQLContext>;
    let schemaName = "";

    before(async () => {
      const sslConfig = resolveSslConfig();
      adminPool = createPool({
        databaseUrl: baseDatabaseUrl,
        databaseSsl: sslConfig.databaseSsl,
        databaseSslRejectUnauthorized: sslConfig.databaseSslRejectUnauthorized,
      });

      schemaName = createSchemaName();
      await adminPool.query(`CREATE SCHEMA "${schemaName}"`);

      appPool = createPool({
        databaseUrl: withSearchPath(baseDatabaseUrl, schemaName),
        databaseSsl: sslConfig.databaseSsl,
        databaseSslRejectUnauthorized: sslConfig.databaseSslRejectUnauthorized,
      });
      await runMigrations(appPool);

      server = new ApolloServer({ typeDefs, resolvers });
    });

    beforeEach(async () => {
      await appPool.query(`TRUNCATE TABLE users, tasks, columns, boards RESTART IDENTITY CASCADE`);
    });

    after(async () => {
      await server.stop();
      await appPool.end();
      await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await adminPool.end();
    });

    test("moveTask keeps positions coherent in the same column", async () => {
      const board = await createBoard(server, appPool, "Move Task Board");
      const columnId = await createColumn(server, appPool, board.id, "Todo", 0);
      const firstTaskId = await createTask(server, appPool, {
        boardId: board.id,
        columnId,
        title: "Task A",
        position: 0,
      });
      await createTask(server, appPool, {
        boardId: board.id,
        columnId,
        title: "Task B",
        position: 1,
      });
      await createTask(server, appPool, {
        boardId: board.id,
        columnId,
        title: "Task C",
        position: 2,
      });

      const moveResult = await gql<{
        moveTask: { id: string; position: number };
      }>(
        server,
        appPool,
        `
          mutation Move($input: MoveTaskInput!) {
            moveTask(input: $input) {
              id
              position
            }
          }
        `,
        {
          input: {
            id: firstTaskId,
            board_id: board.id,
            column_id: columnId,
            position: 2,
          },
        },
      );
      assert.equal(moveResult.errors, undefined);
      assert.equal(moveResult.data?.moveTask.id, firstTaskId);
      assert.equal(moveResult.data?.moveTask.position, 2);

      const listResult = await gql<{
        taskListByToken: { tasks: Array<{ id: string; title: string; position: number }> } | null;
      }>(
        server,
        appPool,
        `
          query ByToken($token: String!) {
            taskListByToken(token: $token) {
              tasks {
                id
                title
                position
              }
            }
          }
        `,
        { token: board.linkToken },
      );
      assert.equal(listResult.errors, undefined);
      assert.ok(listResult.data?.taskListByToken);

      const positionsByTitle = new Map(
        listResult.data.taskListByToken.tasks.map((task) => [task.title, task.position]),
      );
      assert.equal(positionsByTitle.get("Task B"), 0);
      assert.equal(positionsByTitle.get("Task C"), 1);
      assert.equal(positionsByTitle.get("Task A"), 2);
    });

    test("invalid UUID returns BAD_USER_INPUT", async () => {
      const result = await gql<{ createColumn: { id: string } }>(
        server,
        appPool,
        `
          mutation Create($input: CreateColumnInput!) {
            createColumn(input: $input) {
              id
            }
          }
        `,
        {
          input: {
            board_id: "not-a-uuid",
            title: "Todo",
            position: 0,
          },
        },
      );

      assert.ok(result.errors);
      assert.equal(getErrorCode(result.errors[0]), "BAD_USER_INPUT");
    });

    test("not found errors return NOT_FOUND", async () => {
      const result = await gql<{ updateTask: { id: string } }>(
        server,
        appPool,
        `
          mutation Update($input: UpdateTaskInput!) {
            updateTask(input: $input) {
              id
            }
          }
        `,
        {
          input: {
            id: "d595896f-8103-4f86-8ca4-4bb94e4acef1",
            title: "Updated",
          },
        },
      );

      assert.ok(result.errors);
      assert.equal(getErrorCode(result.errors[0]), "NOT_FOUND");
    });

    test("deleteBoard cascades to columns, tasks, and users", async () => {
      const board = await createBoard(server, appPool, "Cascade Board");
      const columnId = await createColumn(server, appPool, board.id, "Todo", 0);
      const taskId = await createTask(server, appPool, {
        boardId: board.id,
        columnId,
        title: "Task to Delete",
        position: 0,
      });
      await joinBoard(server, appPool, board.id, "Alice");

      const deleteResult = await gql<{ deleteBoard: boolean }>(
        server,
        appPool,
        `
          mutation Delete($id: ID!) {
            deleteBoard(id: $id)
          }
        `,
        { id: board.id },
      );
      assert.equal(deleteResult.errors, undefined);
      assert.equal(deleteResult.data?.deleteBoard, true);

      const boardResult = await gql<{ board: { id: string } | null }>(
        server,
        appPool,
        `
          query Board($id: ID!) {
            board(id: $id) {
              id
            }
          }
        `,
        { id: board.id },
      );
      assert.equal(boardResult.errors, undefined);
      assert.equal(boardResult.data?.board, null);

      const taskResult = await gql<{ task: { id: string } | null }>(
        server,
        appPool,
        `
          query Task($id: ID!) {
            task(id: $id) {
              id
            }
          }
        `,
        { id: taskId },
      );
      assert.equal(taskResult.errors, undefined);
      assert.equal(taskResult.data?.task, null);

      const taskListResult = await gql<{ taskListByToken: { board: { id: string } } | null }>(
        server,
        appPool,
        `
          query ByToken($token: String!) {
            taskListByToken(token: $token) {
              board {
                id
              }
            }
          }
        `,
        { token: board.linkToken },
      );
      assert.equal(taskListResult.errors, undefined);
      assert.equal(taskListResult.data?.taskListByToken, null);
    });
  });
}

async function gql<TData>(
  server: ApolloServer<GraphQLContext>,
  pool: Pool,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data?: TData | null; errors?: Array<{ extensions?: Record<string, unknown> }> }> {
  const response = await server.executeOperation(
    {
      query,
      variables,
    },
    {
      contextValue: buildContext(pool),
    },
  );

  if (response.body.kind !== "single") {
    throw new Error("Expected a single GraphQL response body");
  }

  const single = response.body.singleResult;
  return {
    data: single.data as TData | null | undefined,
    errors: single.errors as Array<{ extensions?: Record<string, unknown> }> | undefined,
  };
}

function getErrorCode(error: { extensions?: Record<string, unknown> } | undefined): string | null {
  if (!error?.extensions) {
    return null;
  }

  const code = error.extensions.code;
  return typeof code === "string" ? code : null;
}

async function createBoard(
  server: ApolloServer<GraphQLContext>,
  pool: Pool,
  title: string,
): Promise<{ id: string; linkToken: string }> {
  const result = await gql<{ createBoard: { id: string; link_token: string } }>(
    server,
    pool,
    `
      mutation CreateBoard($input: CreateBoardInput!) {
        createBoard(input: $input) {
          id
          link_token
        }
      }
    `,
    { input: { title } },
  );

  assert.equal(result.errors, undefined);
  assert.ok(result.data?.createBoard);
  return {
    id: result.data.createBoard.id,
    linkToken: result.data.createBoard.link_token,
  };
}

async function createColumn(
  server: ApolloServer<GraphQLContext>,
  pool: Pool,
  boardId: string,
  title: string,
  position: number,
): Promise<string> {
  const result = await gql<{ createColumn: { id: string } }>(
    server,
    pool,
    `
      mutation CreateColumn($input: CreateColumnInput!) {
        createColumn(input: $input) {
          id
        }
      }
    `,
    {
      input: {
        board_id: boardId,
        title,
        position,
      },
    },
  );

  assert.equal(result.errors, undefined);
  assert.ok(result.data?.createColumn);
  return result.data.createColumn.id;
}

async function createTask(
  server: ApolloServer<GraphQLContext>,
  pool: Pool,
  params: {
    boardId: string;
    columnId: string;
    title: string;
    position: number;
  },
): Promise<string> {
  const result = await gql<{ createTask: { id: string } }>(
    server,
    pool,
    `
      mutation CreateTask($input: CreateTaskInput!) {
        createTask(input: $input) {
          id
        }
      }
    `,
    {
      input: {
        board_id: params.boardId,
        column_id: params.columnId,
        title: params.title,
        position: params.position,
      },
    },
  );

  assert.equal(result.errors, undefined);
  assert.ok(result.data?.createTask);
  return result.data.createTask.id;
}

async function joinBoard(
  server: ApolloServer<GraphQLContext>,
  pool: Pool,
  boardId: string,
  name: string,
): Promise<string> {
  const result = await gql<{ joinBoard: { id: string } }>(
    server,
    pool,
    `
      mutation JoinBoard($input: JoinBoardInput!) {
        joinBoard(input: $input) {
          id
        }
      }
    `,
    {
      input: {
        board_id: boardId,
        name,
      },
    },
  );

  assert.equal(result.errors, undefined);
  assert.ok(result.data?.joinBoard);
  return result.data.joinBoard.id;
}

function createSchemaName(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `api_test_${Date.now()}_${random}`;
}

function withSearchPath(databaseUrl: string, schema: string): string {
  const url = new URL(databaseUrl);
  const searchPathOption = `-c search_path=${schema},public`;
  const existingOptions = url.searchParams.get("options");
  const nextOptions = existingOptions
    ? `${existingOptions} ${searchPathOption}`
    : searchPathOption;
  url.searchParams.set("options", nextOptions);
  return url.toString();
}

function resolveSslConfig(): {
  databaseSsl: boolean;
  databaseSslRejectUnauthorized: boolean;
} {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  return {
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
