import { queryRows } from "../../db/query.js";
import type { GraphQLContext } from "../context.js";
import type {
  BoardRow,
  ColumnRow,
  TaskListPayload,
  TaskRow,
  UserRow,
} from "../types.js";

export const objectResolvers = {
  TaskListData: {
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
    async board(
      parent: ColumnRow,
      _args: unknown,
      ctx: GraphQLContext,
    ): Promise<BoardRow> {
      const rows = await queryRows<BoardRow>(
        ctx,
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
    async column(
      parent: TaskRow,
      _args: unknown,
      ctx: GraphQLContext,
    ): Promise<ColumnRow> {
      const rows = await queryRows<ColumnRow>(
        ctx,
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

    async board(
      parent: TaskRow,
      _args: unknown,
      ctx: GraphQLContext,
    ): Promise<BoardRow> {
      const rows = await queryRows<BoardRow>(
        ctx,
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
    async board(
      parent: UserRow,
      _args: unknown,
      ctx: GraphQLContext,
    ): Promise<BoardRow> {
      const rows = await queryRows<BoardRow>(
        ctx,
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
