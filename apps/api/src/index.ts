import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { Pool, type QueryResultRow } from "pg";
import { DateTimeScalar } from "./scalars/date-time.scalar.js";

// Database row shapes returned by raw SQL queries.
// These are internal to the API and map 1:1 with table columns.
type BoardRow = {
  id: string;
  link_token: string;
  title: string;
  created_at: Date;
  updated_at: Date;
};

type ColumnRow = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: Date;
};

type TaskRow = {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description: string | null;
  position: number;
};

type UserRow = {
  id: string;
  name: string;
  password: string;
  board_id: string;
  last_seen: Date;
};

type TaskListByTokenRow = {
  board_id: string;
  board_link_token: string;
  board_title: string;
  board_created_at: Date;
  board_updated_at: Date;
  column_id: string | null;
  column_title: string | null;
  column_position: number | null;
  column_created_at: Date | null;
  task_id: string | null;
  task_title: string | null;
  task_description: string | null;
  task_position: number | null;
  user_id: string | null;
  user_name: string | null;
  user_password: string | null;
  user_last_seen: Date | null;
};

type TaskListPayload = {
  board: BoardRow;
  columns: ColumnRow[];
  tasks: TaskRow[];
  users: UserRow[];
};

type Context = {
  pool: Pool;
};

// Fail fast at startup when the DB connection string is missing.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// Shared PostgreSQL connection pool used by all resolvers.
const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

async function queryRows<TRow extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<TRow[]> {
  // Small helper to keep query/rows boilerplate out of resolvers.
  const result = await pool.query<TRow>(sql, params);
  return result.rows;
}

// Defines the API types and operations
const typeDefs = `#graphql
  scalar DateTime

  type Board {
    id: ID!
    link_token: String!
    title: String!
    created_at: DateTime!
    updated_at: DateTime!
  }

  type Column {
    id: ID!
    board: Board!
    title: String!
    position: Int!
    created_at: DateTime!
  }

  type Task {
    id: ID!
    column: Column!
    board: Board!
    title: String!
    description: String
    position: Int!
  }

  type Users {
    id: ID!
    name: String!
    password: String!
    board: Board!
    last_seen: DateTime!
  }

  type TaskListData {
    board: Board!
    columns: [Column!]!
    tasks: [Task!]!
    users: [Users!]!
  }

  type Query {
    taskListByToken(token: String!): TaskListData
    board(id: ID!): Board
    task(id: ID!): Task
  }

  input CreateBoardInput {
    title: String!
  }

  input CreateColumnInput {
    board_id: ID!
    title: String!
    position: Int!
  }

  input CreateTaskInput {
    board_id: ID!
    column_id: ID!
    title: String!
    description: String
    position: Int!
  }

  input UpdateTaskInput {
    id: ID!
    title: String
    description: String
  }

  input MoveTaskInput {
    id: ID!
    board_id: ID!
    column_id: ID!
    position: Int!
  }

  type Mutation {
    createBoard(input: CreateBoardInput!): Board!
    createColumn(input: CreateColumnInput!): Column!
    createTask(input: CreateTaskInput!): Task!
    updateTask(input: UpdateTaskInput!): Task!
    moveTask(input: MoveTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
  }
`;

// Resolver behavior
const resolvers = {
  DateTime: DateTimeScalar.scalar,
  Query: {
    async taskListByToken(
      _parent: unknown,
      args: { token: string },
      _ctx: Context,
    ): Promise<TaskListPayload | null> {
      // Load the full board payload in one query:
      // board + columns + tasks + users, then de-duplicate in memory.
      const rows = await queryRows<TaskListByTokenRow>(
        `
          SELECT
            b.id AS board_id,
            b.link_token AS board_link_token,
            b.title AS board_title,
            b.created_at AS board_created_at,
            b.updated_at AS board_updated_at,
            c.id AS column_id,
            c.title AS column_title,
            c.position AS column_position,
            c.created_at AS column_created_at,
            t.id AS task_id,
            t.title AS task_title,
            t.description AS task_description,
            t.position AS task_position,
            u.id AS user_id,
            u.name AS user_name,
            u.password AS user_password,
            u.last_seen AS user_last_seen
          FROM boards b
          LEFT JOIN columns c ON c.board_id = b.id
          LEFT JOIN tasks t ON t.board_id = b.id AND t.column_id = c.id
          LEFT JOIN users u ON u.board_id = b.id
          WHERE b.link_token = $1
          ORDER BY c.position ASC, t.position ASC, u.last_seen DESC
        `,
        [args.token],
      );

      if (rows.length === 0) {
        return null;
      }

      // Every row contains board data, so we can read it from the first row.
      const board: BoardRow = {
        id: rows[0].board_id,
        link_token: rows[0].board_link_token,
        title: rows[0].board_title,
        created_at: rows[0].board_created_at,
        updated_at: rows[0].board_updated_at,
      };

      const columnsById = new Map<string, ColumnRow>();
      const tasksById = new Map<string, TaskRow>();
      const usersById = new Map<string, UserRow>();

      for (const row of rows) {
        // LEFT JOIN can produce nulls; only materialize entities when IDs exist.
        if (row.column_id !== null) {
          columnsById.set(row.column_id, {
            id: row.column_id,
            board_id: row.board_id,
            title: row.column_title ?? "",
            position: row.column_position ?? 0,
            created_at: row.column_created_at ?? rows[0].board_created_at,
          });
        }

        if (row.task_id !== null) {
          tasksById.set(row.task_id, {
            id: row.task_id,
            column_id: row.column_id ?? "",
            board_id: row.board_id,
            title: row.task_title ?? "",
            description: row.task_description,
            position: row.task_position ?? 0,
          });
        }

        if (row.user_id !== null) {
          usersById.set(row.user_id, {
            id: row.user_id,
            name: row.user_name ?? "",
            password: row.user_password ?? "",
            board_id: row.board_id,
            last_seen: row.user_last_seen ?? rows[0].board_created_at,
          });
        }
      }

      return {
        board,
        columns: [...columnsById.values()],
        tasks: [...tasksById.values()],
        users: [...usersById.values()],
      };
    },
    async board(
      _parent: unknown,
      args: { id: string },
      _ctx: Context,
    ): Promise<BoardRow | null> {
      const rows = await queryRows<BoardRow>(
        `
          SELECT id, link_token, title, created_at, updated_at
          FROM boards
          WHERE id = $1
          LIMIT 1
        `,
        [args.id],
      );
      return rows[0] ?? null;
    },
    async task(
      _parent: unknown,
      args: { id: string },
      _ctx: Context,
    ): Promise<TaskRow | null> {
      const rows = await queryRows<TaskRow>(
        `
          SELECT id, column_id, board_id, title, description, position
          FROM tasks
          WHERE id = $1
          LIMIT 1
        `,
        [args.id],
      );
      return rows[0] ?? null;
    },
  },
  Mutation: {
    async createBoard(
      _parent: unknown,
      args: { input: { title: string } },
      _ctx: Context,
    ): Promise<BoardRow> {
      // Generate a URL-safe token in Postgres so board links are shareable.
      const rows = await queryRows<BoardRow>(
        `
          INSERT INTO boards (link_token, title)
          VALUES (encode(gen_random_bytes(12), 'hex'), $1)
          RETURNING id, link_token, title, created_at, updated_at
        `,
        [args.input.title],
      );
      return rows[0];
    },
    async createColumn(
      _parent: unknown,
      args: { input: { board_id: string; title: string; position: number } },
      _ctx: Context,
    ): Promise<ColumnRow> {
      const rows = await queryRows<ColumnRow>(
        `
          INSERT INTO columns (board_id, title, position)
          VALUES ($1, $2, $3)
          RETURNING id, board_id, title, position, created_at
        `,
        [args.input.board_id, args.input.title, args.input.position],
      );
      return rows[0];
    },
    async createTask(
      _parent: unknown,
      args: {
        input: {
          board_id: string;
          column_id: string;
          title: string;
          description?: string | null;
          position: number;
        };
      },
      _ctx: Context,
    ): Promise<TaskRow> {
      const rows = await queryRows<TaskRow>(
        `
          INSERT INTO tasks (board_id, column_id, title, description, position)
          VALUES ($1, $2, $3, COALESCE($4, ''), $5)
          RETURNING id, column_id, board_id, title, description, position
        `,
        [
          args.input.board_id,
          args.input.column_id,
          args.input.title,
          args.input.description ?? null,
          args.input.position,
        ],
      );
      return rows[0];
    },
    async updateTask(
      _parent: unknown,
      args: { input: { id: string; title?: string | null; description?: string | null } },
      _ctx: Context,
    ): Promise<TaskRow> {
      const rows = await queryRows<TaskRow>(
        `
          UPDATE tasks
          SET
            title = COALESCE($2, title),
            description = COALESCE($3, description)
          WHERE id = $1
          RETURNING id, column_id, board_id, title, description, position
        `,
        [args.input.id, args.input.title ?? null, args.input.description ?? null],
      );

      if (!rows[0]) {
        // Surface explicit not-found errors to GraphQL callers.
        throw new Error(`Task with id ${args.input.id} not found`);
      }

      return rows[0];
    },
    async moveTask(
      _parent: unknown,
      args: {
        input: {
          id: string;
          board_id: string;
          column_id: string;
          position: number;
        };
      },
      _ctx: Context,
    ): Promise<TaskRow> {
      const rows = await queryRows<TaskRow>(
        `
          UPDATE tasks
          SET
            board_id = $2,
            column_id = $3,
            position = $4
          WHERE id = $1
          RETURNING id, column_id, board_id, title, description, position
        `,
        [
          args.input.id,
          args.input.board_id,
          args.input.column_id,
          args.input.position,
        ],
      );

      if (!rows[0]) {
        throw new Error(`Task with id ${args.input.id} not found`);
      }

      return rows[0];
    },
    async deleteTask(
      _parent: unknown,
      args: { id: string },
      _ctx: Context,
    ): Promise<boolean> {
      const rows = await queryRows<{ id: string }>(
        `
          DELETE FROM tasks
          WHERE id = $1
          RETURNING id
        `,
        [args.id],
      );
      return rows.length > 0;
    },
  },
  TaskListData: {
    // Explicit field resolvers keep the payload contract obvious.
    board(parent: TaskListPayload): BoardRow {
      return parent.board;
    },
    columns(parent: TaskListPayload): ColumnRow[] {
      return parent.columns;
    },
    tasks(parent: TaskListPayload): TaskRow[] {
      return parent.tasks;
    },
    users(parent: TaskListPayload): UserRow[] {
      return parent.users;
    },
  },
  Column: {
    // Relation resolver: Column -> Board
    async board(parent: ColumnRow, _args: unknown, _ctx: Context): Promise<BoardRow> {
      const rows = await queryRows<BoardRow>(
        `
          SELECT id, link_token, title, created_at, updated_at
          FROM boards
          WHERE id = $1
          LIMIT 1
        `,
        [parent.board_id],
      );

      if (!rows[0]) {
        throw new Error(`Board with id ${parent.board_id} not found`);
      }

      return rows[0];
    },
  },
  Task: {
    // Relation resolvers: Task -> Column and Task -> Board
    async column(parent: TaskRow, _args: unknown, _ctx: Context): Promise<ColumnRow> {
      const rows = await queryRows<ColumnRow>(
        `
          SELECT id, board_id, title, position, created_at
          FROM columns
          WHERE id = $1
          LIMIT 1
        `,
        [parent.column_id],
      );

      if (!rows[0]) {
        throw new Error(`Column with id ${parent.column_id} not found`);
      }

      return rows[0];
    },
    async board(parent: TaskRow, _args: unknown, _ctx: Context): Promise<BoardRow> {
      const rows = await queryRows<BoardRow>(
        `
          SELECT id, link_token, title, created_at, updated_at
          FROM boards
          WHERE id = $1
          LIMIT 1
        `,
        [parent.board_id],
      );

      if (!rows[0]) {
        throw new Error(`Board with id ${parent.board_id} not found`);
      }

      return rows[0];
    },
  },
  Users: {
    // Relation resolver: Users -> Board
    async board(parent: UserRow, _args: unknown, _ctx: Context): Promise<BoardRow> {
      const rows = await queryRows<BoardRow>(
        `
          SELECT id, link_token, title, created_at, updated_at
          FROM boards
          WHERE id = $1
          LIMIT 1
        `,
        [parent.board_id],
      );

      if (!rows[0]) {
        throw new Error(`Board with id ${parent.board_id} not found`);
      }

      return rows[0];
    },
  },
};

async function main() {
  // Create Apollo server with schema + resolver map.
  const server = new ApolloServer({ typeDefs, resolvers });

  const port = Number(process.env.PORT || 4000); // Railway injects PORT
  const { url } = await startStandaloneServer(server, {
    // Make shared resources available to each request.
    context: async () => ({ pool }),
    listen: { port, host: "0.0.0.0" },
  });

  console.log(`GraphQL running at ${url}`);
}

// Handle errors
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
