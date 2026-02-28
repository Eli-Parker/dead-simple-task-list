import { useState, type Dispatch, type SetStateAction, type FormEvent, type SyntheticEvent } from 'react'
import './Board.css'

/**
 * Typing for an individual task
 */
type TaskCard = {
  id: number
  title: string
  detail: string
}

/**
 * Typing for an entire column
 */
type BoardColumn = {
  id: number
  name: string
  cards: TaskCard[]
}

type BoardSetup = {
  taskListName: string
  taskListPassword: string
  memberName: string
  memberPassword: string
}

/**
 * Submits the board info to the API
 * @param boardSetup The params for the board setup
 * @param setBoardSetup 
 * @param setIsSetupComplete 
 * @returns 
 */
function submitBoardSetup(
  boardSetup: BoardSetup,
  setBoardSetup: Dispatch<SetStateAction<BoardSetup>>,
  setIsSetupComplete: Dispatch<SetStateAction<boolean>>,
) {

  // Empty names
  if (!boardSetup.taskListName.trim() || !boardSetup.memberName.trim()) {
    return
  }


  setBoardSetup((prevSetup) => ({
    ...prevSetup,
    taskListName: prevSetup.taskListName.trim(),
    memberName: prevSetup.memberName.trim(),
  }))

  // TODO add graphQL query from apiHelpers.tsx
  setIsSetupComplete(true)
}

/**
 * Add a task to a column
 * @param columnId Column ID
 * @param setColumns function to set the columns
 */
function addTask(
  columnId: number,
  taskTitle: string,
  setColumns: Dispatch<SetStateAction<BoardColumn[]>>,
) {
  const cleanTitle = taskTitle.trim()
  if (!cleanTitle) {
    return
  }

  setColumns((prevColumns) => {
    const nextTaskId = prevColumns
      .flatMap((column) => column.cards)
      .reduce((maxId, card) => Math.max(maxId, card.id), 0) + 1

    return prevColumns.map((column) => {
      if (column.id !== columnId) {
        return column
      }

      return {
        ...column,
        cards: [
          ...column.cards,
          {
            id: nextTaskId,
            title: cleanTitle,
            detail: '',
          },
        ],
      }
    })
  })
}

/**
 * Add a column to the task list
 * @param columnName The column label
 * @param setColumns the function to set the column state
 */
function addColumn(
  columnName: string,
  setColumns: Dispatch<SetStateAction<BoardColumn[]>>,
) {
  const cleanName = columnName.trim()
  if (!cleanName) {
    return
  }

  setColumns((prevColumns) => {
    const nextColumnId =
      prevColumns.reduce((maxId, column) => Math.max(maxId, column.id), 0) + 1

    return [
      ...prevColumns,
      {
        id: nextColumnId,
        name: cleanName,
        cards: [],
      },
    ]
  })
}

/**
 * Contains the tsx for the board page.
 * 
 * @returns The entire /board page
 */
export default function BoardPage() {
  const [columns, setColumns] = useState<BoardColumn[]>(boardColumns)
  const [newTaskTitles, setNewTaskTitles] = useState<Record<number, string>>({})
  const [newColumnName, setNewColumnName] = useState('')
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [boardSetup, setBoardSetup] = useState<BoardSetup>({
    taskListName: '',
    taskListPassword: '',
    memberName: '',
    memberPassword: '',
  })

  const handleSetupSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitBoardSetup(boardSetup, setBoardSetup, setIsSetupComplete)
  }

  const handleTaskSubmit = (event: FormEvent<HTMLFormElement>, columnId: number) => {
    event.preventDefault()
    const title = newTaskTitles[columnId] ?? ''
    addTask(columnId, title, setColumns)
    setNewTaskTitles((prevTitles) => ({
      ...prevTitles,
      [columnId]: '',
    }))
  }

  const handleColumnSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    addColumn(newColumnName, setColumns)
    setNewColumnName('')
  }

  return (
    <main className="board-page">
      {!isSetupComplete && (
        <div className="board-setup-overlay" role="dialog" aria-modal="true" aria-labelledby="board-setup-title">
          <form className="board-setup-modal" onSubmit={handleSetupSubmit}>
            <h2 id="board-setup-title" className="board-setup-title">Set Up Your Task List</h2>

            <label className="board-setup-label" htmlFor="task-list-name">Task list name</label>
            <input
              id="task-list-name"
              className="board-setup-input"
              type="text"
              value={boardSetup.taskListName}
              onChange={(event) =>
                setBoardSetup((prevSetup) => ({
                  ...prevSetup,
                  taskListName: event.target.value,
                }))
              }
              required
            />

            <label className="board-setup-label" htmlFor="task-list-password">Task list password (optional)</label>
            <input
              id="task-list-password"
              className="board-setup-input"
              type="password"
              value={boardSetup.taskListPassword}
              onChange={(event) =>
                setBoardSetup((prevSetup) => ({
                  ...prevSetup,
                  taskListPassword: event.target.value,
                }))
              }
            />

            <label className="board-setup-label" htmlFor="member-name">Your name</label>
            <input
              id="member-name"
              className="board-setup-input"
              type="text"
              value={boardSetup.memberName}
              onChange={(event) =>
                setBoardSetup((prevSetup) => ({
                  ...prevSetup,
                  memberName: event.target.value,
                }))
              }
              required
            />

            <label className="board-setup-label" htmlFor="member-password">Name password (optional)</label>
            <input
              id="member-password"
              className="board-setup-input"
              type="password"
              value={boardSetup.memberPassword}
              onChange={(event) =>
                setBoardSetup((prevSetup) => ({
                  ...prevSetup,
                  memberPassword: event.target.value,
                }))
              }
            />

            <button type="submit" className="board-button board-setup-submit">Continue</button>
          </form>
        </div>
      )}

      {/* Header */}
      <header className="board-header">
        <div>
          <p className="board-subtitle">The Dead Simple Task List</p>
          <h1 className="board-title">{boardSetup.taskListName || 'Dev Board'}</h1>
          {isSetupComplete && (
            <p className="board-member">Signed in as {boardSetup.memberName}</p>
          )}
        </div>
        <button type="button" className="board-button">
          <svg className="board-share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" >
            <path d="M14 3h7v7" /> <path d="M10 14 21 3" /> <path d="M21 14v7H3V3h7" />
          </svg>
          Share
        </button>
      </header>

      {/* Board section */}
      <section className="board-grid">
        {/* Load columns */}
        {columns.map((column) => (
          <article key={column.id} className="board-column">
            <div className="board-column-header">
              <h2 className="board-column-title">{column.name}</h2>
              <div className="board-column-actions">
                <span className="board-count-pill">{column.cards.length}</span>
              </div>
            </div>
            <div className="board-cards">
              {/* Load cards */}
              {column.cards.map((card) => (
                <div key={card.id} className="board-card">
                  <h3 className="board-card-title">{card.title}</h3>
                  <p className="board-card-detail">{card.detail}</p>
                </div>
              ))}

              <form
                className="board-inline-form"
                onSubmit={(event) => handleTaskSubmit(event, column.id)}
              >
                <input
                  className="board-inline-input"
                  type="text"
                  value={newTaskTitles[column.id] ?? ''}
                  onChange={(event) =>
                    setNewTaskTitles((prevTitles) => ({
                      ...prevTitles,
                      [column.id]: event.target.value,
                    }))
                  }
                  placeholder="+ Add task"
                  aria-label={`Add task to ${column.name}`}
                />
                <button
                  type="submit"
                  className="board-task-button"
                  disabled={!(newTaskTitles[column.id] ?? '').trim()}
                >
                  Add
                </button>
              </form>
            </div>
          </article>
        ))}

        <article className="board-column board-add-column">
          <form className="board-inline-form board-add-column-form" onSubmit={handleColumnSubmit}>
            <input
              className="board-inline-input"
              type="text"
              value={newColumnName}
              onChange={(event) => setNewColumnName(event.target.value)}
              placeholder="New column name"
              aria-label="New column name"
            />
            <button
              type="submit"
              className="board-button full"
              disabled={!newColumnName.trim()}
            >
              + Add Column
            </button>
          </form>
        </article>
      </section>
    </main>
  )
}

/**
 * Temp until db gets setup
 */
const boardColumns: BoardColumn[] = [
  {
    id: 1,
    name: 'To Do',
    cards: [
      {
        id: 101,
        title: 'Plan Sprint Scope',
        detail: 'Pick the 3 features to ship this week.',
      },
      {
        id: 102,
        title: 'Draft Wireframes',
        detail: 'Create quick first-pass screens for review.',
      },
    ],
  },
  {
    id: 2,
    name: 'In Progress',
    cards: [
      {
        id: 201,
        title: 'Build Task Form',
        detail: 'Add validation and keyboard submit support.',
      },
      {
        id: 202,
        title: 'Column Layout',
        detail: 'Polish spacing and card density for desktop/mobile.',
      },
    ],
  },
  {
    id: 3,
    name: 'Done',
    cards: [
      {
        id: 301,
        title: 'Project Setup',
        detail: 'Vite + React app scaffolded and running.',
      },
      {
        id: 302,
        title: 'Landing Page',
        detail: 'Marketing screen connected to root route.',
      },
    ],
  },
]
