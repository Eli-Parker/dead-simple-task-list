export type BoardRow = {
  id: string;
  link_token: string;
  title: string;
  created_at: Date;
  updated_at: Date;
};

export type ColumnRow = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: Date;
};

export type TaskRow = {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description: string | null;
  position: number;
};

export type UserRow = {
  id: string;
  name: string;
  password: string;
  board_id: string;
  last_seen: Date;
};

export type TaskListByTokenRow = {
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

export type TaskListPayload = {
  board: BoardRow;
  columns: ColumnRow[];
  tasks: TaskRow[];
  users: UserRow[];
};

export type TaskListByTokenArgs = {
  token: string;
};

export type BoardArgs = {
  id: string;
};

export type TaskArgs = {
  id: string;
};

export type CreateBoardArgs = {
  input: {
    title: string;
  };
};

export type CreateColumnArgs = {
  input: {
    board_id: string;
    title: string;
    position: number;
  };
};

export type CreateTaskArgs = {
  input: {
    board_id: string;
    column_id: string;
    title: string;
    description?: string | null;
    position: number;
  };
};

export type UpdateTaskArgs = {
  input: {
    id: string;
    title?: string | null;
    description?: string | null;
  };
};

export type MoveTaskArgs = {
  input: {
    id: string;
    board_id: string;
    column_id: string;
    position: number;
  };
};

export type DeleteTaskArgs = {
  id: string;
};
