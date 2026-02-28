import { useState, type Dispatch, type SetStateAction } from 'react'
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

/**
 * Add a task to a column
 * @param columnId Column ID
 * @param setColumns function to set the columns
 */
function addTask(
  columnId: number,
  setColumns: Dispatch<SetStateAction<BoardColumn[]>>,
) {
  const title = window.prompt('Task title:')

  if (!title?.trim()) {
    return
  }

  const detail = window.prompt('Task detail (optional):')?.trim() ?? ''

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
            title: title.trim(),
            detail: detail || '',
          },
        ],
      }
    })
  })
}

/**
 * Add a column to the task list
 * @param setColumns the function to set the column state
 */
function addColumn(setColumns: Dispatch<SetStateAction<BoardColumn[]>>) {
  const name = window.prompt('New column name:')

  if (!name?.trim()) {
    return
  }

  setColumns((prevColumns) => {
    const nextColumnId =
      prevColumns.reduce((maxId, column) => Math.max(maxId, column.id), 0) + 1

    return [
      ...prevColumns,
      {
        id: nextColumnId,
        name: name.trim(),
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

  return (
    <main className="board-page">
      {/* Header */}
      <header className="board-header">
        <div>
          <p className="board-subtitle">The Dead Simple Task List</p>
          <h1 className="board-title">Dev Board</h1>
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
                <button
                  type="button"
                  className="board-task-button"
                  onClick={() => addTask(column.id, setColumns)}
                >
                  + Task
                </button>
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
            </div>
          </article>
        ))}

        <article className="board-column board-add-column">
          <button
            type="button"
            className="board-button full"
            onClick={() => addColumn(setColumns)}
          >
            + Add Column
          </button>
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
