import { queryRows } from "../../db/query.js";
import type { GraphQLContext } from "../context.js";
import type {
  BoardRow,
  ColumnRow,
  CreateBoardArgs,
  CreateColumnArgs,
  CreateTaskArgs,
  DeleteTaskArgs,
  MoveTaskArgs,
  TaskRow,
  UpdateTaskArgs,
} from "../types.js";

export const mutationResolvers = {
  async createBoard(
    _parent: unknown,
    args: CreateBoardArgs,
    ctx: GraphQLContext,
  ): Promise<BoardRow> {
    const rows = await queryRows<BoardRow>(
      ctx,
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
    args: CreateColumnArgs,
    ctx: GraphQLContext,
  ): Promise<ColumnRow> {
    const rows = await queryRows<ColumnRow>(
      ctx,
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
    args: CreateTaskArgs,
    ctx: GraphQLContext,
  ): Promise<TaskRow> {
    const rows = await queryRows<TaskRow>(
      ctx,
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
    args: UpdateTaskArgs,
    ctx: GraphQLContext,
  ): Promise<TaskRow> {
    const rows = await queryRows<TaskRow>(
      ctx,
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
      throw new Error(`Task with id ${args.input.id} not found`);
    }

    return rows[0];
  },

  async moveTask(
    _parent: unknown,
    args: MoveTaskArgs,
    ctx: GraphQLContext,
  ): Promise<TaskRow> {
    const rows = await queryRows<TaskRow>(
      ctx,
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
    args: DeleteTaskArgs,
    ctx: GraphQLContext,
  ): Promise<boolean> {
    const rows = await queryRows<{ id: string }>(
      ctx,
      `
        DELETE FROM tasks
        WHERE id = $1
        RETURNING id
      `,
      [args.id],
    );
    return rows.length > 0;
  },
};
