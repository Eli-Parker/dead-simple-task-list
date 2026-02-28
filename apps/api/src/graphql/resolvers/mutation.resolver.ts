import { createHash } from "node:crypto";
import { queryRows } from "../../db/query.js";
import type { GraphQLContext } from "../context.js";
import { badUserInput, notFound } from "../errors.js";
import type {
  BoardRow,
  ColumnRow,
  CreateBoardArgs,
  CreateColumnArgs,
  CreateTaskArgs,
  DeleteBoardArgs,
  DeleteColumnArgs,
  DeleteTaskArgs,
  HeartbeatUserArgs,
  JoinBoardArgs,
  LeaveBoardArgs,
  MoveColumnArgs,
  MoveTaskArgs,
  TaskRow,
  UpdateBoardArgs,
  UpdateColumnArgs,
  UpdateTaskArgs,
  UserRow,
} from "../types.js";
import {
  assertNonNegativeInteger,
  assertRequiredText,
  assertUuid,
} from "../validation.js";

export const mutationResolvers = {
  async createBoard(
    _parent: unknown,
    args: CreateBoardArgs,
    ctx: GraphQLContext,
  ): Promise<BoardRow> {
    const title = assertRequiredText(args.input.title, "input.title");

    const rows = await queryRows<BoardRow>(
      ctx,
      `
        INSERT INTO boards (link_token, title)
        VALUES (encode(gen_random_bytes(12), 'hex'), $1)
        RETURNING id, link_token, title, created_at, updated_at
      `,
      [title],
    );
    return rows[0];
  },

  async updateBoard(
    _parent: unknown,
    args: UpdateBoardArgs,
    ctx: GraphQLContext,
  ): Promise<BoardRow> {
    assertUuid(args.input.id, "input.id");
    const title = assertRequiredText(args.input.title, "input.title");

    const rows = await queryRows<BoardRow>(
      ctx,
      `
        UPDATE boards
        SET title = $2, updated_at = now()
        WHERE id = $1
        RETURNING id, link_token, title, created_at, updated_at
      `,
      [args.input.id, title],
    );

    if (!rows[0]) {
      notFound(`Board with id ${args.input.id} not found`);
    }

    return rows[0];
  },

  async deleteBoard(
    _parent: unknown,
    args: DeleteBoardArgs,
    ctx: GraphQLContext,
  ): Promise<boolean> {
    assertUuid(args.id, "id");

    const rows = await queryRows<{ id: string }>(
      ctx,
      `
        DELETE FROM boards
        WHERE id = $1
        RETURNING id
      `,
      [args.id],
    );
    return rows.length > 0;
  },

  async createColumn(
    _parent: unknown,
    args: CreateColumnArgs,
    ctx: GraphQLContext,
  ): Promise<ColumnRow> {
    assertUuid(args.input.board_id, "input.board_id");
    const title = assertRequiredText(args.input.title, "input.title");
    assertNonNegativeInteger(args.input.position, "input.position");
    await assertBoardExists(ctx, args.input.board_id);

    const rows = await queryRows<ColumnRow>(
      ctx,
      `
        INSERT INTO columns (board_id, title, position)
        VALUES ($1, $2, $3)
        RETURNING id, board_id, title, position, created_at
      `,
      [args.input.board_id, title, args.input.position],
    );
    return rows[0];
  },

  async updateColumn(
    _parent: unknown,
    args: UpdateColumnArgs,
    ctx: GraphQLContext,
  ): Promise<ColumnRow> {
    assertUuid(args.input.id, "input.id");
    const title = assertRequiredText(args.input.title, "input.title");

    const rows = await queryRows<ColumnRow>(
      ctx,
      `
        UPDATE columns
        SET title = $2
        WHERE id = $1
        RETURNING id, board_id, title, position, created_at
      `,
      [args.input.id, title],
    );

    if (!rows[0]) {
      notFound(`Column with id ${args.input.id} not found`);
    }

    return rows[0];
  },

  async moveColumn(
    _parent: unknown,
    args: MoveColumnArgs,
    ctx: GraphQLContext,
  ): Promise<ColumnRow> {
    assertUuid(args.input.id, "input.id");
    assertUuid(args.input.board_id, "input.board_id");
    assertNonNegativeInteger(args.input.position, "input.position");

    const client = await ctx.pool.connect();
    try {
      await client.query("BEGIN");

      const existingColumnResult = await client.query<{
        id: string;
        board_id: string;
        position: number;
      }>(
        `
          SELECT id, board_id, position
          FROM columns
          WHERE id = $1
            AND board_id = $2
          LIMIT 1
          FOR UPDATE
        `,
        [args.input.id, args.input.board_id],
      );

      const existingColumn = existingColumnResult.rows[0];
      if (!existingColumn) {
        notFound(`Column with id ${args.input.id} not found`);
      }

      const maxPositionResult = await client.query<{ max_position: number | null }>(
        `
          SELECT MAX(position) AS max_position
          FROM columns
          WHERE board_id = $1
            AND id <> $2
        `,
        [existingColumn.board_id, existingColumn.id],
      );

      const maxPosition = maxPositionResult.rows[0]?.max_position ?? -1;
      const targetPosition = Math.min(args.input.position, maxPosition + 1);

      if (targetPosition < existingColumn.position) {
        await client.query(
          `
            UPDATE columns
            SET position = position + 1
            WHERE board_id = $1
              AND id <> $2
              AND position >= $3
              AND position < $4
          `,
          [
            existingColumn.board_id,
            existingColumn.id,
            targetPosition,
            existingColumn.position,
          ],
        );
      } else if (targetPosition > existingColumn.position) {
        await client.query(
          `
            UPDATE columns
            SET position = position - 1
            WHERE board_id = $1
              AND id <> $2
              AND position <= $3
              AND position > $4
          `,
          [
            existingColumn.board_id,
            existingColumn.id,
            targetPosition,
            existingColumn.position,
          ],
        );
      }

      const movedColumnResult = await client.query<ColumnRow>(
        `
          UPDATE columns
          SET position = $2
          WHERE id = $1
          RETURNING id, board_id, title, position, created_at
        `,
        [existingColumn.id, targetPosition],
      );

      await client.query("COMMIT");
      return movedColumnResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteColumn(
    _parent: unknown,
    args: DeleteColumnArgs,
    ctx: GraphQLContext,
  ): Promise<boolean> {
    assertUuid(args.id, "id");

    const client = await ctx.pool.connect();
    try {
      await client.query("BEGIN");

      const existingColumnResult = await client.query<{ board_id: string; position: number }>(
        `
          SELECT board_id, position
          FROM columns
          WHERE id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [args.id],
      );

      const existingColumn = existingColumnResult.rows[0];
      if (!existingColumn) {
        await client.query("ROLLBACK");
        return false;
      }

      await client.query(
        `
          DELETE FROM columns
          WHERE id = $1
        `,
        [args.id],
      );

      await client.query(
        `
          UPDATE columns
          SET position = position - 1
          WHERE board_id = $1
            AND position > $2
        `,
        [existingColumn.board_id, existingColumn.position],
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async createTask(
    _parent: unknown,
    args: CreateTaskArgs,
    ctx: GraphQLContext,
  ): Promise<TaskRow> {
    assertUuid(args.input.board_id, "input.board_id");
    assertUuid(args.input.column_id, "input.column_id");
    const title = assertRequiredText(args.input.title, "input.title");
    assertNonNegativeInteger(args.input.position, "input.position");
    await assertColumnBelongsToBoard(ctx, args.input.column_id, args.input.board_id);

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
        title,
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
    assertUuid(args.input.id, "input.id");
    const hasTitle = args.input.title !== undefined && args.input.title !== null;
    const hasDescription =
      args.input.description !== undefined && args.input.description !== null;

    if (!hasTitle && !hasDescription) {
      badUserInput("input must include at least one field to update");
    }

    const title = hasTitle ? assertRequiredText(args.input.title as string, "input.title") : null;

    const rows = await queryRows<TaskRow>(
      ctx,
      `
        UPDATE tasks
        SET
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          updated_at = now()
        WHERE id = $1
        RETURNING id, column_id, board_id, title, description, position
      `,
      [args.input.id, title, args.input.description ?? null],
    );

    if (!rows[0]) {
      notFound(`Task with id ${args.input.id} not found`);
    }

    return rows[0];
  },

  async moveTask(
    _parent: unknown,
    args: MoveTaskArgs,
    ctx: GraphQLContext,
  ): Promise<TaskRow> {
    assertUuid(args.input.id, "input.id");
    assertUuid(args.input.board_id, "input.board_id");
    assertUuid(args.input.column_id, "input.column_id");
    assertNonNegativeInteger(args.input.position, "input.position");

    const client = await ctx.pool.connect();
    try {
      await client.query("BEGIN");

      const existingTaskResult = await client.query<{
        id: string;
        board_id: string;
        column_id: string;
        position: number;
      }>(
        `
          SELECT id, board_id, column_id, position
          FROM tasks
          WHERE id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [args.input.id],
      );

      const existingTask = existingTaskResult.rows[0];
      if (!existingTask) {
        notFound(`Task with id ${args.input.id} not found`);
      }

      const targetColumnResult = await client.query<{ id: string }>(
        `
          SELECT id
          FROM columns
          WHERE id = $1
            AND board_id = $2
          LIMIT 1
        `,
        [args.input.column_id, args.input.board_id],
      );
      if (!targetColumnResult.rows[0]) {
        badUserInput("input.column_id must belong to input.board_id");
      }

      const sameColumn =
        existingTask.board_id === args.input.board_id &&
        existingTask.column_id === args.input.column_id;

      if (sameColumn) {
        const maxPositionResult = await client.query<{ max_position: number | null }>(
          `
            SELECT MAX(position) AS max_position
            FROM tasks
            WHERE board_id = $1
              AND column_id = $2
              AND id <> $3
          `,
          [existingTask.board_id, existingTask.column_id, existingTask.id],
        );

        const maxPosition = maxPositionResult.rows[0]?.max_position ?? -1;
        const targetPosition = Math.min(args.input.position, maxPosition + 1);

        if (targetPosition < existingTask.position) {
          await client.query(
            `
              UPDATE tasks
              SET position = position + 1
              WHERE board_id = $1
                AND column_id = $2
                AND id <> $3
                AND position >= $4
                AND position < $5
            `,
            [
              existingTask.board_id,
              existingTask.column_id,
              existingTask.id,
              targetPosition,
              existingTask.position,
            ],
          );
        } else if (targetPosition > existingTask.position) {
          await client.query(
            `
              UPDATE tasks
              SET position = position - 1
              WHERE board_id = $1
                AND column_id = $2
                AND id <> $3
                AND position <= $4
                AND position > $5
            `,
            [
              existingTask.board_id,
              existingTask.column_id,
              existingTask.id,
              targetPosition,
              existingTask.position,
            ],
          );
        }
      } else {
        await client.query(
          `
            UPDATE tasks
            SET position = position - 1
            WHERE board_id = $1
              AND column_id = $2
              AND id <> $3
              AND position > $4
          `,
          [
            existingTask.board_id,
            existingTask.column_id,
            existingTask.id,
            existingTask.position,
          ],
        );

        const targetMaxPositionResult = await client.query<{ max_position: number | null }>(
          `
            SELECT MAX(position) AS max_position
            FROM tasks
            WHERE board_id = $1
              AND column_id = $2
          `,
          [args.input.board_id, args.input.column_id],
        );

        const targetMaxPosition = targetMaxPositionResult.rows[0]?.max_position ?? -1;
        const targetPosition = Math.min(args.input.position, targetMaxPosition + 1);

        await client.query(
          `
            UPDATE tasks
            SET position = position + 1
            WHERE board_id = $1
              AND column_id = $2
              AND position >= $3
          `,
          [args.input.board_id, args.input.column_id, targetPosition],
        );
      }

      const targetMaxPositionResult = await client.query<{ max_position: number | null }>(
        `
          SELECT MAX(position) AS max_position
          FROM tasks
          WHERE board_id = $1
            AND column_id = $2
            AND id <> $3
        `,
        [args.input.board_id, args.input.column_id, args.input.id],
      );

      const targetMaxPosition = targetMaxPositionResult.rows[0]?.max_position ?? -1;
      const targetPosition = Math.min(args.input.position, targetMaxPosition + 1);

      const movedTaskResult = await client.query<TaskRow>(
        `
          UPDATE tasks
          SET
            board_id = $2,
            column_id = $3,
            position = $4,
            updated_at = now()
          WHERE id = $1
          RETURNING id, column_id, board_id, title, description, position
        `,
        [args.input.id, args.input.board_id, args.input.column_id, targetPosition],
      );

      await client.query("COMMIT");
      return movedTaskResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteTask(
    _parent: unknown,
    args: DeleteTaskArgs,
    ctx: GraphQLContext,
  ): Promise<boolean> {
    assertUuid(args.id, "id");

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

  async joinBoard(
    _parent: unknown,
    args: JoinBoardArgs,
    ctx: GraphQLContext,
  ): Promise<UserRow> {
    assertUuid(args.input.board_id, "input.board_id");
    const name = assertRequiredText(args.input.name, "input.name");
    await assertBoardExists(ctx, args.input.board_id);

    const passwordHash = hashPassword(args.input.password);
    const rows = await queryRows<UserRow>(
      ctx,
      `
        INSERT INTO users (board_id, name, password_hash, last_seen)
        VALUES ($1, $2, $3, now())
        ON CONFLICT (name, password_hash, board_id)
        DO UPDATE SET last_seen = now()
        RETURNING id, name, board_id, last_seen
      `,
      [args.input.board_id, name, passwordHash],
    );

    return rows[0];
  },

  async heartbeatUser(
    _parent: unknown,
    args: HeartbeatUserArgs,
    ctx: GraphQLContext,
  ): Promise<UserRow> {
    assertUuid(args.input.id, "input.id");

    const rows = await queryRows<UserRow>(
      ctx,
      `
        UPDATE users
        SET last_seen = now()
        WHERE id = $1
        RETURNING id, name, board_id, last_seen
      `,
      [args.input.id],
    );

    if (!rows[0]) {
      notFound(`User with id ${args.input.id} not found`);
    }

    return rows[0];
  },

  async leaveBoard(
    _parent: unknown,
    args: LeaveBoardArgs,
    ctx: GraphQLContext,
  ): Promise<boolean> {
    assertUuid(args.id, "id");

    const rows = await queryRows<{ id: string }>(
      ctx,
      `
        DELETE FROM users
        WHERE id = $1
        RETURNING id
      `,
      [args.id],
    );
    return rows.length > 0;
  },
};

async function assertBoardExists(ctx: GraphQLContext, boardId: string): Promise<void> {
  const rows = await queryRows<{ id: string }>(
    ctx,
    `
      SELECT id
      FROM boards
      WHERE id = $1
      LIMIT 1
    `,
    [boardId],
  );

  if (!rows[0]) {
    notFound(`Board with id ${boardId} not found`);
  }
}

async function assertColumnBelongsToBoard(
  ctx: GraphQLContext,
  columnId: string,
  boardId: string,
): Promise<void> {
  const rows = await queryRows<{ id: string }>(
    ctx,
    `
      SELECT id
      FROM columns
      WHERE id = $1
        AND board_id = $2
      LIMIT 1
    `,
    [columnId, boardId],
  );

  if (!rows[0]) {
    badUserInput("input.column_id must belong to input.board_id");
  }
}

function hashPassword(password: string | null | undefined): string | null {
  if (password === undefined || password === null) {
    return null;
  }

  const trimmed = password.trim();
  if (!trimmed) {
    return null;
  }

  return createHash("sha256").update(trimmed).digest("hex");
}
