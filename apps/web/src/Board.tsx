import { useState, type Dispatch, type SetStateAction, type FormEvent, type SyntheticEvent } from 'react'
import './Board.css'
import { modifyColumn, updateTaskColumn } from './apiHelpers'

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
  const [taskTitleDrafts, setTaskTitleDrafts] = useState<Record<number, string>>({})
  const [taskDetailDrafts, setTaskDetailDrafts] = useState<Record<number, string>>({})
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [draggingColumnId, setDraggingColumnId] = useState<number | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<number | null>(null)
  const [draggingTask, setDraggingTask] = useState<{ taskId: number, sourceColumnId: number } | null>(null)
  const [taskDropTarget, setTaskDropTarget] = useState<{ columnId: number, index: number } | null>(null)
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
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      return
    }

    const nextTaskId = columns
      .flatMap((column) => column.cards)
      .reduce((maxId, card) => Math.max(maxId, card.id), 0) + 1

    setColumns((prevColumns) =>
      prevColumns.map((column) => {
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
      }),
    )

    setNewTaskTitles((prevTitles) => ({
      ...prevTitles,
      [columnId]: '',
    }))
    setTaskTitleDrafts((prevDrafts) => ({
      ...prevDrafts,
      [nextTaskId]: cleanTitle,
    }))
    setTaskDetailDrafts((prevDrafts) => ({
      ...prevDrafts,
      [nextTaskId]: '',
    }))
    setEditingTaskId(nextTaskId)
  }

  const handleColumnSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    addColumn(newColumnName, setColumns)
    setNewColumnName('')
  }

  const handleEditStart = (card: TaskCard) => {
    setTaskTitleDrafts((prevDrafts) => ({
      ...prevDrafts,
      [card.id]: card.title,
    }))
    setTaskDetailDrafts((prevDrafts) => ({
      ...prevDrafts,
      [card.id]: card.detail,
    }))
    setEditingTaskId(card.id)
  }

  const handleEditCancel = (cardId: number) => {
    setEditingTaskId((prevId) => (prevId === cardId ? null : prevId))
  }

  const handleDetailSave = (
    event: FormEvent<HTMLFormElement>,
    columnId: number,
    cardId: number,
  ) => {
    event.preventDefault()
    const updatedTitle = (taskTitleDrafts[cardId] ?? '').trim()
    const updatedDetail = (taskDetailDrafts[cardId] ?? '').trim()
    if (!updatedTitle) {
      return
    }

    setColumns((prevColumns) =>
      prevColumns.map((column) => {
        if (column.id !== columnId) {
          return column
        }

        return {
          ...column,
          cards: column.cards.map((card) =>
            card.id === cardId
              ? {
                ...card,
                title: updatedTitle,
                detail: updatedDetail,
              }
              : card,
          ),
        }
      }),
    )
    setEditingTaskId((prevId) => (prevId === cardId ? null : prevId))
  }

  const handleColumnDragStart = (columnId: number) => {
    setDraggingColumnId(columnId)
    setDragOverColumnId(columnId)
  }

  const handleColumnDragEnd = () => {
    setDraggingColumnId(null)
    setDragOverColumnId(null)
  }

  const handleColumnDrop = (targetColumnId: number) => {
    if (draggingColumnId === null || draggingColumnId === targetColumnId) {
      setDragOverColumnId(null)
      return
    }

    const nextPosition = columns.findIndex((column) => column.id === targetColumnId)
    if (nextPosition === -1) {
      setDragOverColumnId(null)
      return
    }

    setColumns((prevColumns) => {
      const sourceIndex = prevColumns.findIndex((column) => column.id === draggingColumnId)
      const destinationIndex = prevColumns.findIndex((column) => column.id === targetColumnId)

      if (sourceIndex === -1 || destinationIndex === -1) {
        return prevColumns
      }

      const nextColumns = [...prevColumns]
      const [movedColumn] = nextColumns.splice(sourceIndex, 1)
      nextColumns.splice(destinationIndex, 0, movedColumn)
      return nextColumns
    })

    void modifyColumn(String(draggingColumnId), nextPosition)
    setDragOverColumnId(null)
  }

  const handleTaskDragStart = (taskId: number, sourceColumnId: number) => {
    setDraggingTask({ taskId, sourceColumnId })
  }

  const handleTaskDragEnd = () => {
    setDraggingTask(null)
    setTaskDropTarget(null)
  }

  const handleTaskMove = (
    targetColumnId: number,
    targetIndex: number,
  ) => {
    if (!draggingTask) {
      return
    }

    setColumns((prevColumns) => {
      const sourceColumnIndex = prevColumns.findIndex((column) => column.id === draggingTask.sourceColumnId)
      const targetColumnIndex = prevColumns.findIndex((column) => column.id === targetColumnId)

      if (sourceColumnIndex === -1 || targetColumnIndex === -1) {
        return prevColumns
      }

      const sourceCards = [...prevColumns[sourceColumnIndex].cards]
      const sourceTaskIndex = sourceCards.findIndex((card) => card.id === draggingTask.taskId)
      if (sourceTaskIndex === -1) {
        return prevColumns
      }

      const [movedTask] = sourceCards.splice(sourceTaskIndex, 1)
      const targetCards =
        sourceColumnIndex === targetColumnIndex
          ? sourceCards
          : [...prevColumns[targetColumnIndex].cards]

      const clampedIndex = Math.max(0, Math.min(targetIndex, targetCards.length))
      targetCards.splice(clampedIndex, 0, movedTask)

      return prevColumns.map((column, index) => {
        if (index === sourceColumnIndex && sourceColumnIndex === targetColumnIndex) {
          return {
            ...column,
            cards: targetCards,
          }
        }

        if (index === sourceColumnIndex) {
          return {
            ...column,
            cards: sourceCards,
          }
        }

        if (index === targetColumnIndex) {
          return {
            ...column,
            cards: targetCards,
          }
        }

        return column
      })
    })

    void updateTaskColumn(String(draggingTask.taskId), String(targetColumnId), targetIndex)
    setDraggingTask(null)
    setTaskDropTarget(null)
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
          <article
            key={column.id}
            className={`board-column${dragOverColumnId === column.id ? ' board-column-drop-target' : ''}`}
            onDragOver={(event) => {
              if (draggingColumnId === null) {
                return
              }
              event.preventDefault()
              setDragOverColumnId(column.id)
            }}
            onDrop={(event) => {
              if (draggingColumnId === null) {
                return
              }
              event.preventDefault()
              handleColumnDrop(column.id)
            }}
          >
            <div className="board-column-header">
              <h2 className="board-column-title">{column.name}</h2>
              <div className="board-column-actions">
                <span className="board-count-pill">{column.cards.length}</span>
                <button
                  type="button"
                  className="board-column-drag-handle"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    handleColumnDragStart(column.id)
                  }}
                  onDragEnd={handleColumnDragEnd}
                  aria-label={`Drag column ${column.name}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
                    <circle cx="8" cy="6" r="1.6" />
                    <circle cx="16" cy="6" r="1.6" />
                    <circle cx="8" cy="12" r="1.6" />
                    <circle cx="16" cy="12" r="1.6" />
                    <circle cx="8" cy="18" r="1.6" />
                    <circle cx="16" cy="18" r="1.6" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              className={`board-cards${taskDropTarget?.columnId === column.id ? ' board-cards-drop-target' : ''}`}
              onDragOver={(event) => {
                if (!draggingTask) {
                  return
                }
                event.preventDefault()
                event.stopPropagation()
                setTaskDropTarget({
                  columnId: column.id,
                  index: column.cards.length,
                })
              }}
              onDrop={(event) => {
                if (!draggingTask) {
                  return
                }
                event.preventDefault()
                event.stopPropagation()
                handleTaskMove(column.id, column.cards.length)
              }}
            >
              {/* Load cards */}
              {column.cards.map((card, cardIndex) => (
                <div
                  key={card.id}
                  className={`board-card${editingTaskId === card.id ? ' board-card-editing' : ''}${draggingTask?.taskId === card.id ? ' board-card-dragging' : ''}${taskDropTarget?.columnId === column.id && taskDropTarget.index === cardIndex ? ' board-card-drop-target' : ''}`}
                  draggable={editingTaskId !== card.id}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    handleTaskDragStart(card.id, column.id)
                  }}
                  onDragEnd={handleTaskDragEnd}
                  onDragOver={(event) => {
                    if (!draggingTask) {
                      return
                    }
                    event.preventDefault()
                    event.stopPropagation()
                    setTaskDropTarget({
                      columnId: column.id,
                      index: cardIndex,
                    })
                  }}
                  onDrop={(event) => {
                    if (!draggingTask) {
                      return
                    }
                    event.preventDefault()
                    event.stopPropagation()
                    handleTaskMove(column.id, cardIndex)
                  }}
                >
                  {editingTaskId !== card.id && (
                    <button
                      type="button"
                      className="board-card-edit-button"
                      onClick={() => handleEditStart(card)}
                      aria-label={`Edit ${card.title}`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="m16.5 3.5 4 4L7 21l-4 1 1-4Z" />
                      </svg>
                    </button>
                  )}
                  {editingTaskId === card.id ? (
                    <form
                      className="board-card-edit-form"
                      onSubmit={(event) => handleDetailSave(event, column.id, card.id)}
                    >
                      <input
                        className="board-card-title-input"
                        type="text"
                        value={taskTitleDrafts[card.id] ?? ''}
                        onChange={(event) =>
                          setTaskTitleDrafts((prevDrafts) => ({
                            ...prevDrafts,
                            [card.id]: event.target.value,
                          }))
                        }
                        placeholder="Task title"
                        aria-label="Task title"
                        autoFocus
                      />
                      <textarea
                        className="board-card-edit-input"
                        value={taskDetailDrafts[card.id] ?? ''}
                        onChange={(event) =>
                          setTaskDetailDrafts((prevDrafts) => ({
                            ...prevDrafts,
                            [card.id]: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Add a description..."
                        aria-label={`Description for ${card.title}`}
                      />
                      <div className="board-card-edit-actions">
                        <button
                          type="submit"
                          className="board-task-button"
                          disabled={!(taskTitleDrafts[card.id] ?? '').trim()}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="board-task-button board-task-button-subtle"
                          onClick={() => handleEditCancel(card.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <h3 className="board-card-title">{card.title}</h3>
                      <p className="board-card-detail">{card.detail || 'No description yet.'}</p>
                    </>
                  )}
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
