import { queryRows } from "../../db/query.js";
import type { GraphQLContext } from "../context.js";
import type {
  BoardArgs,
  BoardRow,
  TaskArgs,
  TaskListByTokenArgs,
  TaskListByTokenRow,
  TaskListPayload,
  TaskRow,
  ColumnRow,
  UserRow,
} from "../types.js";

export const queryResolvers = {
  async taskListByToken(
    _parent: unknown,
    args: TaskListByTokenArgs,
    ctx: GraphQLContext,
  ): Promise<TaskListPayload | null> {
    const rows = await queryRows<TaskListByTokenRow>(
      ctx,
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
    args: BoardArgs,
    ctx: GraphQLContext,
  ): Promise<BoardRow | null> {
    const rows = await queryRows<BoardRow>(
      ctx,
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
    args: TaskArgs,
    ctx: GraphQLContext,
  ): Promise<TaskRow | null> {
    const rows = await queryRows<TaskRow>(
      ctx,
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
};
