import { mutationResolvers } from './apiResolvers/mutationResolvers'
import { queryResolvers } from './apiResolvers/queryResolvers'

/**
 * Central registry of API resolver field names used by client helper methods.
 *
 * `query` maps GraphQL Query field names.
 * `mutation` maps GraphQL Mutation field names.
 */
export const apiResolvers = {
  query: queryResolvers,
  mutation: mutationResolvers,
} as const

const GRAPHQL_API_URL = import.meta.env.VITE_API_URL ?? 'http://db.deadsimpletasks.app'

type GraphQLResponse<TData> = {
  data?: TData | null
  errors?: Array<{ message?: string }>
}

/**
 * Client-side shape for board details returned by board lookup operations.
 */
export type BoardDetails = {
  id: string
  linkToken: string
  title: string
  createdAt: string
  updatedAt: string
  columns: Array<{
    id: string
    title: string
    position: number
  }>
  taskIds: string[]
}

/**
 * Creates a brand new board and returns its board link token.
 *
 * Planned API resolver target:
 * `Mutation.createBoard`
 *
 * Planned GraphQL input mapping:
 * `{ input: { title: boardTitle } }`
 *
 * Planned return mapping:
 * returns the created board's `link_token` field as a string.
 *
 * @param boardTitle Board title that will map to `input.title`.
 * @returns Promise resolving to the created board link token, or `null` if creation fails.
 */
export async function createBoard(
  boardTitle: string,
): Promise<string | null> {
  const mutationName = apiResolvers.mutation.createBoard
  const mutation = `
    mutation CreateBoard($input: CreateBoardInput!) {
      ${mutationName}(input: $input) {
        link_token
      }
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: { title: boardTitle },
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<string, { link_token: string } | null | undefined>
    >

    if (payload.errors?.length) {
      return null
    }

    return payload.data?.[mutationName]?.link_token ?? null
  } catch {
    return null
  }
}

/**
 * Retrieves board information for a specific board link token.
 *
 * Planned API resolver target:
 * `Query.taskListByToken`
 *
 * Planned GraphQL input mapping:
 * - `boardLinkToken` -> `token`
 *
 * Planned return mapping:
 * - `id` -> `id`
 * - `link_token` -> `linkToken`
 * - `title` -> `title`
 * - `created_at` -> `createdAt`
 * - `updated_at` -> `updatedAt`
 * - board columns -> `columns` (list of associated columns with id/title/position)
 * - board tasks -> `taskIds` (list of associated task IDs)
 *
 * @param boardLinkToken Board link token used to fetch board details.
 * @returns Promise resolving to board details, or `null` if lookup fails.
 */
export async function getBoardById(
  boardLinkToken: string,
): Promise<BoardDetails | null> {
  const queryName = apiResolvers.query.taskListByToken
  const query = `
    query GetBoardByLinkToken($token: String!) {
      ${queryName}(token: $token) {
        board {
          id
          link_token
          title
          created_at
          updated_at
        }
        columns {
          id
          title
          position
        }
        tasks {
          id
        }
      }
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          token: boardLinkToken,
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<
        string,
        | {
            board: {
              id: string
              link_token: string
              title: string
              created_at: string
              updated_at: string
            }
            columns: Array<{ id: string; title: string; position: number }>
            tasks: Array<{ id: string }>
          }
        | null
        | undefined
      >
    >

    if (payload.errors?.length) {
      return null
    }

    const boardData = payload.data?.[queryName]
    if (!boardData) {
      return null
    }

    return {
      id: boardData.board.id,
      linkToken: boardData.board.link_token,
      title: boardData.board.title,
      createdAt: boardData.board.created_at,
      updatedAt: boardData.board.updated_at,
      columns: boardData.columns.map((column) => ({
        id: column.id,
        title: column.title,
        position: column.position,
      })),
      taskIds: boardData.tasks.map((task) => task.id),
    }
  } catch {
    return null
  }
}

/**
 * Adds a user to a board and returns the user ID.
 *
 * Planned API resolver target:
 * `Mutation.joinBoard`
 *
 * Planned GraphQL input mapping:
 * - `boardLinkToken` -> lookup board via `Query.taskListByToken(token)`
 * - looked-up `board.id` -> `input.board_id`
 * - `userName` -> `input.name`
 * - `password` -> `input.password` (optional)
 *
 * Planned return mapping:
 * returns the joined/created user's `id` field as a string.
 *
 * @param boardLinkToken Board link token the user is joining.
 * @param userName Display name for the user.
 * @param password Optional password for user identity on this board.
 * @returns Promise resolving to the user ID, or `null` if the operation fails.
 */
export async function addUserToBoard(
  boardLinkToken: string,
  userName: string,
  password?: string,
): Promise<string | null> {
  const board = await getBoardById(boardLinkToken)
  if (!board) {
    return null
  }

  const mutationName = apiResolvers.mutation.joinBoard
  const mutation = `
    mutation AddUserToBoard($input: JoinBoardInput!) {
      ${mutationName}(input: $input) {
        id
      }
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            board_id: board.id,
            name: userName,
            password,
          },
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<string, { id: string } | null | undefined>
    >

    if (payload.errors?.length) {
      return null
    }

    return payload.data?.[mutationName]?.id ?? null
  } catch {
    return null
  }
}

/**
 * Creates a new column in a specific board and returns the created column ID.
 *
 * Planned API resolver target:
 * `Mutation.createColumn`
 *
 * Planned GraphQL input mapping:
 * - `boardLinkToken` -> lookup board via `Query.taskListByToken(token)`
 * - looked-up `board.id` -> `input.board_id`
 * - `columnName` -> `input.title`
 * - `columnPosition` -> `input.position`
 *
 * Planned return mapping:
 * returns the created column's `id` field as a string.
 *
 * @param columnName Human-readable column title.
 * @param boardLinkToken Board link token for the board the new column belongs to.
 * @param columnPosition Zero-based position/index for column ordering.
 * @returns Promise resolving to the created column ID, or `null` if creation fails.
 */
export async function createColumn(
  columnName: string,
  boardLinkToken: string,
  columnPosition: number,
): Promise<string | null> {
  const board = await getBoardById(boardLinkToken)
  if (!board) {
    return null
  }

  const mutationName = apiResolvers.mutation.createColumn
  const mutation = `
    mutation CreateColumn($input: CreateColumnInput!) {
      ${mutationName}(input: $input) {
        id
      }
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            board_id: board.id,
            title: columnName,
            position: columnPosition,
          },
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<string, { id: string } | null | undefined>
    >

    if (payload.errors?.length) {
      return null
    }

    return payload.data?.[mutationName]?.id ?? null
  } catch {
    return null
  }
}

/**
 * Modifies an existing column by updating its position.
 *
 * Planned API resolver target:
 * `Mutation.moveColumn` (position change flow).
 *
 * Planned GraphQL input mapping:
 * - `columnId` -> `input.id`
 * - `newColumnPosition` -> `input.position`
 *
 * Note:
 * the current API `moveColumn` resolver also expects `input.board_id`.
 * This helper intentionally captures only the requested contract for now.
 *
 * @param columnId Column identifier to modify.
 * @param newColumnPosition New zero-based position/index for this column.
 * @returns Promise resolving to `null` after attempting the operation.
 */
export async function modifyColumn(
  columnId: string,
  newColumnPosition: number,
): Promise<null> {
  const boardLinkToken =
    typeof window === 'undefined' ? '' : window.location.search.replace(/^\?/, '')

  if (!boardLinkToken) {
    return null
  }

  const board = await getBoardById(boardLinkToken)
  if (!board) {
    return null
  }

  const mutationName = apiResolvers.mutation.moveColumn
  const mutation = `
    mutation MoveColumn($input: MoveColumnInput!) {
      ${mutationName}(input: $input) {
        id
      }
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            id: columnId,
            board_id: board.id,
            position: newColumnPosition,
          },
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<string, { id: string } | null | undefined>
    >

    if (payload.errors?.length) {
      return null
    }

    return null
  } catch {
    return null
  }
}

/**
 * Updates an existing column title.
 *
 * Planned API resolver target:
 * `Mutation.updateColumn`
 *
 * Planned GraphQL input mapping:
 * - `columnId` -> `input.id`
 * - `newColumnTitle` -> `input.title`
 *
 * @param columnId Column identifier to update.
 * @param newColumnTitle New title for the column.
 * @returns Promise resolving to `null` after attempting the operation.
 */
export async function updateColumnTitle(
  columnId: string,
  newColumnTitle: string,
): Promise<null> {
  const mutationName = apiResolvers.mutation.updateColumn
  const mutation = `
    mutation UpdateColumn($input: UpdateColumnInput!) {
      ${mutationName}(input: $input) {
        id
      }
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            id: columnId,
            title: newColumnTitle,
          },
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<string, { id: string } | null | undefined>
    >

    if (payload.errors?.length) {
      return null
    }

    return null
  } catch {
    return null
  }
}

/**
 * Deletes a column by column ID.
 *
 * Expected behavior requirement:
 * deleting a column should also delete all tasks associated with that column.
 *
 * Planned API resolver target:
 * `Mutation.deleteColumn`
 *
 * Planned GraphQL input mapping:
 * - `columnId` -> `id`
 *
 * Planned return handling:
 * the API currently returns a boolean, but this helper is intentionally
 * modeled as "return nothing" per the requested contract.
 *
 * @param columnId Column identifier to delete.
 * @returns Promise resolving to `null` after attempting the operation.
 */
export async function deleteColumn(columnId: string): Promise<null> {
  const mutationName = apiResolvers.mutation.deleteColumn
  const mutation = `
    mutation DeleteColumn($id: ID!) {
      ${mutationName}(id: $id)
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: columnId,
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<string, boolean | null | undefined>
    >

    if (payload.errors?.length) {
      return null
    }

    return null
  } catch {
    return null
  }
}

/**
 * Client-side shape for task details returned by task lookup operations.
 */
export type TaskDetails = {
  id: string
  columnId: string
  boardId: string
  title: string
  description: string | null
  position: number
}

/**
 * Creates a new task in a specific board and returns the created task ID.
 *
 * Planned API resolver target:
 * `Mutation.createTask`
 *
 * Planned GraphQL input mapping:
 * - `boardLinkToken` -> lookup board via `Query.taskListByToken(token)`
 * - looked-up `board.id` -> `input.board_id`
 * - `columnId` -> `input.column_id`
 * - `taskName` -> `input.title`
 * - `taskDescription` -> `input.description` (optional)
 * - `taskPosition` -> `input.position`
 * - `createdAt` is accepted by this helper contract for client-side task creation
 *   metadata, but current API mutation does not expose a `created_at` input field.
 *
 * Planned return mapping:
 * returns the created task's `id` field as a string.
 *
 * @param boardLinkToken Board link token where the task will be created.
 * @param taskName Human-readable task title.
 * @param columnId Column identifier where the task will initially reside.
 * @param taskDescription Optional task description.
 * @param taskPosition Zero-based position/index for task ordering in the column.
 * @param createdAt Client-provided creation timestamp for local/workflow usage.
 * @returns Promise resolving to the created task ID, or `null` if creation fails.
 */
export async function createTask(
  boardLinkToken: string,
  taskName: string,
  columnId: string,
  taskDescription: string | null | undefined,
  taskPosition: number,
  createdAt: string,
): Promise<string | null> {
  void createdAt

  const board = await getBoardById(boardLinkToken)
  if (!board) {
    return null
  }

  const mutationName = apiResolvers.mutation.createTask
  const mutation = `
    mutation CreateTask($input: CreateTaskInput!) {
      ${mutationName}(input: $input) {
        id
      }
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            board_id: board.id,
            column_id: columnId,
            title: taskName,
            description: taskDescription,
            position: taskPosition,
          },
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<string, { id: string } | null | undefined>
    >

    if (payload.errors?.length) {
      return null
    }

    return payload.data?.[mutationName]?.id ?? null
  } catch {
    return null
  }
}

/**
 * Updates an existing task title and/or description.
 *
 * Planned API resolver target:
 * `Mutation.updateTask`
 *
 * Planned GraphQL input mapping:
 * - `taskId` -> `input.id`
 * - `taskTitle` -> `input.title` (optional)
 * - `taskDescription` -> `input.description` (optional)
 *
 * @param taskId Task identifier to update.
 * @param taskTitle Optional new task title.
 * @param taskDescription Optional new task description.
 * @returns Promise resolving to `null` after attempting the operation.
 */
export async function updateTask(
  taskId: string,
  taskTitle?: string,
  taskDescription?: string,
): Promise<null> {
  const mutationName = apiResolvers.mutation.updateTask
  const mutation = `
    mutation UpdateTask($input: UpdateTaskInput!) {
      ${mutationName}(input: $input) {
        id
      }
    }
  `

  const input: Record<string, string> = {
    id: taskId,
  }

  if (taskTitle !== undefined) {
    input.title = taskTitle
  }

  if (taskDescription !== undefined) {
    input.description = taskDescription
  }

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input,
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<string, { id: string } | null | undefined>
    >

    if (payload.errors?.length) {
      return null
    }

    return null
  } catch {
    return null
  }
}

/**
 * Retrieves task information for a specific task ID.
 *
 * Planned API resolver target:
 * `Query.task`
 *
 * Planned GraphQL input mapping:
 * - `taskId` -> `id`
 *
 * Planned return mapping:
 * - `id` -> `id`
 * - `column_id` -> `columnId`
 * - `board_id` -> `boardId`
 * - `title` -> `title`
 * - `description` -> `description`
 * - `position` -> `position`
 *
 * @param taskId Task identifier used to fetch task details.
 * @returns Promise resolving to task details, or `null` if lookup fails.
 */
export async function getTaskById(
  taskId: string,
): Promise<TaskDetails | null> {
  const queryName = apiResolvers.query.task
  const query = `
    query GetTaskById($id: ID!) {
      ${queryName}(id: $id) {
        id
        title
        description
        position
        column {
          id
        }
        board {
          id
        }
      }
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          id: taskId,
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<
        string,
        | {
            id: string
            title: string
            description: string | null
            position: number
            column: { id: string }
            board: { id: string }
          }
        | null
        | undefined
      >
    >

    if (payload.errors?.length) {
      return null
    }

    const task = payload.data?.[queryName]
    if (!task) {
      return null
    }

    return {
      id: task.id,
      columnId: task.column.id,
      boardId: task.board.id,
      title: task.title,
      description: task.description,
      position: task.position,
    }
  } catch {
    return null
  }
}

/**
 * Updates task information by moving a task to a new column.
 *
 * Planned API resolver target:
 * `Mutation.moveTask` (or equivalent task-update mutation once finalized).
 *
 * Planned GraphQL input mapping:
 * - `taskId` -> `input.id`
 * - `newColumnId` -> `input.column_id`
 * - `taskPosition` -> `input.position`
 *
 * Note:
 * the current API `moveTask` mutation also requires additional fields
 * (such as board and position). This helper intentionally captures only
 * the contract requested for now while implementation details are deferred.
 *
 * @param taskId Task identifier to update.
 * @param newColumnId New column identifier where the task should reside.
 * @param taskPosition Zero-based position/index for task ordering after update.
 * @returns Promise resolving to `null` after attempting the operation.
 */
export async function updateTaskColumn(
  taskId: string,
  newColumnId: string,
  taskPosition: number,
): Promise<null> {
  const task = await getTaskById(taskId)
  if (!task) {
    return null
  }

  const mutationName = apiResolvers.mutation.moveTask
  const mutation = `
    mutation MoveTask($input: MoveTaskInput!) {
      ${mutationName}(input: $input) {
        id
      }
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            id: taskId,
            board_id: task.boardId,
            column_id: newColumnId,
            position: taskPosition,
          },
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<string, { id: string } | null | undefined>
    >

    if (payload.errors?.length) {
      return null
    }

    return null
  } catch {
    return null
  }
}

/**
 * Deletes a task by task ID.
 *
 * Planned API resolver target:
 * `Mutation.deleteTask`
 *
 * Planned GraphQL input mapping:
 * - `taskId` -> `id`
 *
 * Planned return handling:
 * the API currently returns a boolean, but this helper is intentionally
 * modeled as "return nothing" per the requested contract.
 *
 * @param taskId Task identifier to delete.
 * @returns Promise resolving to `null` after attempting the operation.
 */
export async function deleteTask(taskId: string): Promise<null> {
  const mutationName = apiResolvers.mutation.deleteTask
  const mutation = `
    mutation DeleteTask($id: ID!) {
      ${mutationName}(id: $id)
    }
  `

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: taskId,
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GraphQLResponse<
      Record<string, boolean | null | undefined>
    >

    if (payload.errors?.length) {
      return null
    }

    return null
  } catch {
    return null
  }
}
