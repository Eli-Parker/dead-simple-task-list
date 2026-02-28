/**
 * Canonical GraphQL query resolver names used by the web client.
 *
 * These map to API Query fields and will be used to build operation documents
 * in `apiHelpers.tsx` one helper method at a time.
 */
export const queryResolvers = {
  taskListByToken: 'taskListByToken',
  board: 'board',
  task: 'task',
} as const
