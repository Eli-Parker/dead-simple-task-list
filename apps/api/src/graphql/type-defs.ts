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
