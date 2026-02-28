export const typeDefs = `#graphql
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

  input UpdateBoardInput {
    id: ID!
    title: String!
  }

  input CreateColumnInput {
    board_id: ID!
    title: String!
    position: Int!
  }

  input UpdateColumnInput {
    id: ID!
    title: String!
  }

  input MoveColumnInput {
    id: ID!
    board_id: ID!
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

  input JoinBoardInput {
    board_id: ID!
    name: String!
    password: String
  }

  input HeartbeatUserInput {
    id: ID!
  }

  type Mutation {
    createBoard(input: CreateBoardInput!): Board!
    updateBoard(input: UpdateBoardInput!): Board!
    deleteBoard(id: ID!): Boolean!
    createColumn(input: CreateColumnInput!): Column!
    updateColumn(input: UpdateColumnInput!): Column!
    moveColumn(input: MoveColumnInput!): Column!
    deleteColumn(id: ID!): Boolean!
    createTask(input: CreateTaskInput!): Task!
    updateTask(input: UpdateTaskInput!): Task!
    moveTask(input: MoveTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
    joinBoard(input: JoinBoardInput!): Users!
    heartbeatUser(input: HeartbeatUserInput!): Users!
    leaveBoard(id: ID!): Boolean!
  }
`;
