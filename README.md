# The Dead Simple Task List

Apps like Trello can sometimes be annoying to use. Everybody involved needs to have an account, they need to know how to join a group, yada yada yada. It's got integrations, lots of features, all of which are super useful, but what if I just want to make a task list that I can instantly have people join like [when2meet.com](https://when2meet.com/)? Create a list, make a link, and anybody with that link can make and edit tasks, that's all most people need. I made a tool to remedy that!

Obviously, not many people needed this. The big apps work just fine, but I wanted something that I would like to use and figured the rest of you might also like it! I'll be posting the obsidian docs I made to prototype this app and am open sourcing the code.


[https://deadsimpletasks.app/](https://deadsimpletasks.app/)
## The problem
Apps like Trello and DevOps can sometimes be annoying to use. Everybody involved needs to have an account, they need to know how to join a group, yada yada yada. It's got integrations, lots of features, all of which are super useful. But what if I just want to make a task list that I can instantly have people join like [when2meet.com](https://when2meet.com/)?  Create a list, make a link, and anybody with that link can make and edit tasks, that's all most people need.
Trello was designed for people who wanted something robust that could be used to track pretty much anything, but what about people who just want to track their chores or coordinate a team? Nobody's going to use it if it requires all the BS involved with Trello.

### Who needs this?
Most people, hopefully. I'm targeting the average joe who doesn't really know or care about Kanban, and they just want as little interface as possible. The ideal user just wants to organize a few items they've been trying to get done, like homework assignments or chores. They use it for a day, and toss it. Maybe you're on a hackathon or a group project and just want to track something for a week.

People likely won't use this for a big project, maybe some basic projects. They COULD, I'd be happy to have them, but the stability of those mean I likely won't be eating into the big guys' market share.
### What might be useful
- One link to get people into the board and making
	- Flow
		1. User opens link
		2. Inputs name (and optional session and user password)
		3. Profit!
- Saves any lists you were in through local storage so you don't need to go searching for it
- Option to sign in with google and track what boards you've added (not required)
- Ability to export to markdown for the obsidian Kanban extension

### Task flow
- Draw concept
- Define API, Backend
- Create Repository
- Get frontend looking good
- Attach GraphQL based Backend for storage
- Publish
- Profit!

### Concept Art
See the png
### API Graph
See the png
### Postgres Tables
- task_lists
	- id
	- link token
	- title
	- created_at
	- updated_at
- columns
	- id
	- task_list_id
	- title
	- position
	- created_at
- tasks
	- id
	- task_list_id
	- column_id
	- title
	- description  
	- position       
	- archived
	- created_at 
	- updated_at 
<details>
<summary> Code (ChatGPT Concept)</summary>
```
-- Enable if you want gen_random_uuid()
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- 1) TASK LISTS (boards)
-- =========================
CREATE TABLE task_lists (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_token    text UNIQUE NOT NULL,          -- unguessable random token used in the URL
  title         text NOT NULL DEFAULT 'Untitled',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_lists_updated_at ON task_lists (updated_at);


-- =========================
-- 2) PARTICIPANTS (optional but useful)
--    People who enter a name on a board.
-- =========================
CREATE TABLE participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_list_id  uuid NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  display_name  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_participants_task_list ON participants (task_list_id);


-- =========================
-- 3) COLUMNS (lists within a board)
-- =========================
CREATE TABLE columns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_list_id  uuid NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  title         text NOT NULL,
  position      numeric(20,10) NOT NULL,        -- ordering key (supports easy drag/drop)
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- lets tasks enforce "column belongs to same task_list"
  UNIQUE (id, task_list_id)
);

CREATE INDEX idx_columns_task_list_position ON columns (task_list_id, position);


-- =========================
-- 4) TASKS
-- =========================
CREATE TABLE tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_list_id   uuid NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  column_id      uuid NOT NULL,
  title          text NOT NULL,
  description    text NOT NULL DEFAULT '',
  position       numeric(20,10) NOT NULL,       -- ordering key within a column
  archived       boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- Enforce: column_id must belong to same task_list_id
  FOREIGN KEY (column_id, task_list_id)
    REFERENCES columns(id, task_list_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_tasks_list_column_position ON tasks (task_list_id, column_id, position);
CREATE INDEX idx_tasks_list_archived ON tasks (task_list_id, archived);

```
</details>
