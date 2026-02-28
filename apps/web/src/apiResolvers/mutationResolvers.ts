/**
 * Canonical GraphQL mutation resolver names used by the web client.
 *
 * These map to API Mutation fields and will be used to build operation
 * documents in `apiHelpers.tsx` one helper method at a time.
 */
export const mutationResolvers = {
  createBoard: 'createBoard',
  updateBoard: 'updateBoard',
  deleteBoard: 'deleteBoard',
  createColumn: 'createColumn',
  updateColumn: 'updateColumn',
  moveColumn: 'moveColumn',
  deleteColumn: 'deleteColumn',
  createTask: 'createTask',
  updateTask: 'updateTask',
  moveTask: 'moveTask',
  deleteTask: 'deleteTask',
  joinBoard: 'joinBoard',
  heartbeatUser: 'heartbeatUser',
  leaveBoard: 'leaveBoard',
} as const
