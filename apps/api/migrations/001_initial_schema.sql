CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_token text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT 'Untitled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, board_id)
);

CREATE INDEX IF NOT EXISTS idx_columns_board_position ON columns (board_id, position);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL,
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (column_id, board_id)
    REFERENCES columns (id, board_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_board_column_position ON tasks (board_id, column_id, position);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  password_hash text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, password_hash, board_id)
);

CREATE INDEX IF NOT EXISTS idx_users_board_last_seen ON users (board_id, last_seen DESC);
