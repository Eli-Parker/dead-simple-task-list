import { useEffect, useState, type FormEvent } from 'react'
import './Board.css'
import {
  addUserToBoard,
  createBoard,
  createColumn,
  createTask,
  deleteColumn,
  deleteTask,
  getBoardById,
  getTaskById,
  modifyColumn,
  updateTaskColumn,
  type BoardDetails,
  type TaskDetails,
} from './apiHelpers'
import { loadRecentListsFromStorage, saveRecentListsToStorage } from './recentListsStorage'

/**
 * Typing for an individual task
 */
type TaskCard = {
  id: string
  title: string
  detail: string
}

/**
 * Typing for an entire column
 */
type BoardColumn = {
  id: string
  name: string
  cards: TaskCard[]
}

type BoardSetup = {
  taskListName: string
  taskListPassword: string
  memberName: string
  memberPassword: string
}

const LOCAL_ID_PREFIX = 'local-'
const STARTER_COLUMN_NAMES = ['To Do', 'In Progress', 'Done'] as const
const MAX_RECENT_LISTS = 10

type FallbackBoardTemplateColumn = {
  name: string
  cards: Array<{
    title: string
    detail: string
  }>
}

const fallbackBoardTemplate: FallbackBoardTemplateColumn[] = [
  {
    name: 'To Do',
    cards: [
      {
        title: 'Plan Sprint Scope',
        detail: 'Pick the 3 features to ship this week.',
      },
      {
        title: 'Draft Wireframes',
        detail: 'Create quick first-pass screens for review.',
      },
    ],
  },
  {
    name: 'In Progress',
    cards: [
      {
        title: 'Build Task Form',
        detail: 'Add validation and keyboard submit support.',
      },
      {
        title: 'Column Layout',
        detail: 'Polish spacing and card density for desktop/mobile.',
      },
    ],
  },
  {
    name: 'Done',
    cards: [
      {
        title: 'Project Setup',
        detail: 'Vite + React app scaffolded and running.',
      },
      {
        title: 'Landing Page',
        detail: 'Marketing screen connected to root route.',
      },
    ],
  },
]

function createLocalId(kind: 'board' | 'column' | 'task'): string {
  return `${LOCAL_ID_PREFIX}${kind}-${crypto.randomUUID()}`
}

function isLocalId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(LOCAL_ID_PREFIX)
}

function parseBoardIdFromLocation(search: string): string | null {
  if (!search.startsWith('?') || search.length <= 1) {
    return null
  }

  const encodedBoardId = search.slice(1).trim()
  if (!encodedBoardId) {
    return null
  }

  try {
    const decodedBoardId = decodeURIComponent(encodedBoardId).trim()
    return decodedBoardId || null
  } catch {
    return encodedBoardId
  }
}

function writeBoardIdToLocation(boardId: string): void {
  const encodedBoardId = encodeURIComponent(boardId)
  window.history.replaceState({}, '', `/board?${encodedBoardId}`)
}

function cloneFallbackBoardColumns(): BoardColumn[] {
  return fallbackBoardTemplate.map((column) => ({
    id: createLocalId('column'),
    name: column.name,
    cards: column.cards.map((card) => ({
      id: createLocalId('task'),
      title: card.title,
      detail: card.detail,
    })),
  }))
}

async function createStarterColumns(boardId: string): Promise<BoardColumn[]> {
  const createdColumns: BoardColumn[] = []

  for (const [position, columnName] of STARTER_COLUMN_NAMES.entries()) {
    let createdColumnId: string | null = null

    try {
      createdColumnId = await createColumn(columnName, boardId, position)
    } catch {
      createdColumnId = null
    }

    createdColumns.push({
      id: createdColumnId ?? createLocalId('column'),
      name: columnName,
      cards: [],
    })
  }

  return createdColumns
}

async function loadColumnsFromBoardDetails(boardDetails: BoardDetails): Promise<BoardColumn[]> {
  const taskResults = await Promise.all(
    boardDetails.taskIds.map(async (taskId) => {
      try {
        return await getTaskById(taskId)
      } catch {
        return null
      }
    }),
  )

  const taskDetails = taskResults.filter((task): task is TaskDetails => task !== null)
  const tasksByColumnId = new Map<string, TaskDetails[]>()

  for (const task of taskDetails) {
    const existingTasks = tasksByColumnId.get(task.columnId)
    if (existingTasks) {
      existingTasks.push(task)
    } else {
      tasksByColumnId.set(task.columnId, [task])
    }
  }

  for (const taskGroup of tasksByColumnId.values()) {
    taskGroup.sort((left, right) => left.position - right.position)
  }

  const columnsFromBoard = boardDetails.columnIds.map((columnId, index) => ({
    id: columnId,
    name: `Column ${index + 1}`,
    cards: (tasksByColumnId.get(columnId) ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      detail: task.description ?? '',
    })),
  }))

  const knownColumnIds = new Set(boardDetails.columnIds)
  for (const [columnId, taskGroup] of tasksByColumnId.entries()) {
    if (knownColumnIds.has(columnId)) {
      continue
    }

    columnsFromBoard.push({
      id: columnId,
      name: 'Unassigned',
      cards: taskGroup.map((task) => ({
        id: task.id,
        title: task.title,
        detail: task.description ?? '',
      })),
    })
  }

  return columnsFromBoard
}

function saveRecentBoard(title: string, boardId: string): void {
  const existingEntries = loadRecentListsFromStorage([])
  const dedupedEntries = existingEntries.filter((entry) => entry.boardId !== boardId)
  const nextEntries = [{ title, boardId }, ...dedupedEntries].slice(0, MAX_RECENT_LISTS)
  saveRecentListsToStorage(nextEntries)
}

/**
 * Contains the tsx for the board page.
 * 
 * @returns The entire /board page
 */
export default function BoardPage() {
  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [boardId, setBoardId] = useState<string | null>(null)
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({})
  const [taskTitleDrafts, setTaskTitleDrafts] = useState<Record<string, string>>({})
  const [taskDetailDrafts, setTaskDetailDrafts] = useState<Record<string, string>>({})
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [draggingTask, setDraggingTask] = useState<{ taskId: string, sourceColumnId: string } | null>(null)
  const [taskDropTarget, setTaskDropTarget] = useState<{ columnId: string, index: number } | null>(null)
  const [newColumnName, setNewColumnName] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [isSubmittingSetup, setIsSubmittingSetup] = useState(false)
  const [requestedBoardId] = useState<string | null>(() => parseBoardIdFromLocation(window.location.search))
  const [boardSetup, setBoardSetup] = useState<BoardSetup>({
    taskListName: '',
    taskListPassword: '',
    memberName: '',
    memberPassword: '',
  })

  useEffect(() => {
    if (!requestedBoardId) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const boardDetails = await getBoardById(requestedBoardId)
        if (!boardDetails || cancelled) {
          return
        }

        setBoardSetup((prevSetup) => ({
          ...prevSetup,
          taskListName: prevSetup.taskListName.trim() || boardDetails.title,
        }))
      } catch {
        // Leave setup title untouched on prefetch errors.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [requestedBoardId])

  const submitBoardSetup = async (): Promise<void> => {
    if (isSubmittingSetup) {
      return
    }

    const cleanTaskListName = boardSetup.taskListName.trim()
    const cleanMemberName = boardSetup.memberName.trim()
    if (!cleanTaskListName || !cleanMemberName) {
      return
    }

    setIsSubmittingSetup(true)

    try {
      let resolvedBoardId = requestedBoardId
      let resolvedTitle = cleanTaskListName
      let resolvedColumns: BoardColumn[] = []

      if (resolvedBoardId) {
        try {
          const boardDetails = await getBoardById(resolvedBoardId)
          if (boardDetails) {
            resolvedTitle = boardDetails.title
            resolvedColumns = await loadColumnsFromBoardDetails(boardDetails)
          }
        } catch {
          setToastMessage('Could not load board from API. Using local data.')
        }

        if (resolvedColumns.length === 0) {
          resolvedColumns = cloneFallbackBoardColumns()
        }
      } else {
        let createdBoardId: string | null = null

        try {
          createdBoardId = await createBoard(cleanTaskListName)
        } catch {
          createdBoardId = null
          setToastMessage('Could not create board in API. Using local board.')
        }

        resolvedBoardId = createdBoardId ?? createLocalId('board')
        writeBoardIdToLocation(resolvedBoardId)

        if (createdBoardId) {
          resolvedColumns = await createStarterColumns(createdBoardId)
        } else {
          resolvedColumns = cloneFallbackBoardColumns()
        }
      }

      setColumns(resolvedColumns)
      setBoardId(resolvedBoardId)
      setBoardSetup((prevSetup) => ({
        ...prevSetup,
        taskListName: resolvedTitle,
        memberName: cleanMemberName,
      }))
      setIsSetupComplete(true)

      if (resolvedBoardId && !isLocalId(resolvedBoardId)) {
        try {
          await addUserToBoard(
            resolvedBoardId,
            cleanMemberName,
            boardSetup.memberPassword.trim() || undefined,
          )
        } catch {
          setToastMessage('Board opened, but joining as a user failed.')
        }

        saveRecentBoard(resolvedTitle, resolvedBoardId)
      }
    } finally {
      setIsSubmittingSetup(false)
    }
  }

  const handleSetupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitBoardSetup()
  }

  const handleTaskSubmit = (event: FormEvent<HTMLFormElement>, columnId: string) => {
    event.preventDefault()
    const title = newTaskTitles[columnId] ?? ''
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      return
    }

    void (async () => {
      const targetColumn = columns.find((column) => column.id === columnId)
      const nextPosition = targetColumn ? targetColumn.cards.length : 0
      let nextTaskId: string | null = null

      if (boardId && !isLocalId(boardId) && !isLocalId(columnId)) {
        try {
          nextTaskId = await createTask(
            boardId,
            cleanTitle,
            columnId,
            nextPosition,
            new Date().toISOString(),
          )
        } catch {
          nextTaskId = null
          setToastMessage('Could not create task in API. Saved locally.')
        }
      }

      const resolvedTaskId = nextTaskId ?? createLocalId('task')

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
                id: resolvedTaskId,
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
        [resolvedTaskId]: cleanTitle,
      }))
      setTaskDetailDrafts((prevDrafts) => ({
        ...prevDrafts,
        [resolvedTaskId]: '',
      }))
      setEditingTaskId(resolvedTaskId)
    })()
  }

  const handleColumnSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanName = newColumnName.trim()
    if (!cleanName) {
      return
    }

    void (async () => {
      const nextPosition = columns.length
      let createdColumnId: string | null = null

      if (boardId && !isLocalId(boardId)) {
        try {
          createdColumnId = await createColumn(cleanName, boardId, nextPosition)
        } catch {
          createdColumnId = null
          setToastMessage('Could not create column in API. Saved locally.')
        }
      }

      setColumns((prevColumns) => ([
        ...prevColumns,
        {
          id: createdColumnId ?? createLocalId('column'),
          name: cleanName,
          cards: [],
        },
      ]))
      setNewColumnName('')
    })()
  }

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  const handleShare = async () => {
    const currentLink = window.location.href

    try {
      await navigator.clipboard.writeText(currentLink)
      setToastMessage('Link copied to clipboard!')
    } catch {
      setToastMessage('Could not copy link.')
    }
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

  const handleEditCancel = (cardId: string) => {
    setEditingTaskId((prevId) => (prevId === cardId ? null : prevId))
  }

  const handleDetailSave = (
    event: FormEvent<HTMLFormElement>,
    columnId: string,
    cardId: string,
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

  const handleColumnDragStart = (columnId: string) => {
    setDraggingColumnId(columnId)
    setDragOverColumnId(columnId)
  }

  const handleColumnDragEnd = () => {
    setDraggingColumnId(null)
    setDragOverColumnId(null)
  }

  const handleColumnDrop = (targetColumnId: string) => {
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

    if (boardId && !isLocalId(boardId) && !isLocalId(draggingColumnId)) {
      void modifyColumn(draggingColumnId, nextPosition).catch(() => {
        setToastMessage('Could not move column in API.')
      })
    }

    setDragOverColumnId(null)
  }

  const handleTaskDragStart = (taskId: string, sourceColumnId: string) => {
    setDraggingTask({ taskId, sourceColumnId })
  }

  const handleTaskDragEnd = () => {
    setDraggingTask(null)
    setTaskDropTarget(null)
  }

  const handleTaskMove = (
    targetColumnId: string,
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

    if (
      boardId &&
      !isLocalId(boardId) &&
      !isLocalId(draggingTask.taskId) &&
      !isLocalId(targetColumnId)
    ) {
      void updateTaskColumn(draggingTask.taskId, targetColumnId, targetIndex).catch(() => {
        setToastMessage('Could not move task in API.')
      })
    }

    setDraggingTask(null)
    setTaskDropTarget(null)
  }

  const handleTaskDelete = async (columnId: string, taskId: string): Promise<void> => {
    setColumns((prevColumns) =>
      prevColumns.map((column) => {
        if (column.id !== columnId) {
          return column
        }

        return {
          ...column,
          cards: column.cards.filter((card) => card.id !== taskId),
        }
      }),
    )
    setTaskTitleDrafts((prevDrafts) => {
      const nextDrafts = { ...prevDrafts }
      delete nextDrafts[taskId]
      return nextDrafts
    })
    setTaskDetailDrafts((prevDrafts) => {
      const nextDrafts = { ...prevDrafts }
      delete nextDrafts[taskId]
      return nextDrafts
    })
    setEditingTaskId((prevId) => (prevId === taskId ? null : prevId))

    if (!isLocalId(taskId)) {
      try {
        await deleteTask(taskId)
      } catch {
        setToastMessage('Could not delete task in API. Removed locally.')
      }
    }
  }

  const handleColumnDelete = async (columnId: string): Promise<void> => {
    setColumns((prevColumns) => prevColumns.filter((column) => column.id !== columnId))
    setNewTaskTitles((prevTitles) => {
      const nextTitles = { ...prevTitles }
      delete nextTitles[columnId]
      return nextTitles
    })
    setTaskDropTarget((prevTarget) => (
      prevTarget && prevTarget.columnId === columnId
        ? null
        : prevTarget
    ))

    if (!isLocalId(columnId)) {
      try {
        await deleteColumn(columnId)
      } catch {
        setToastMessage('Could not delete column in API. Removed locally.')
      }
    }
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

            <button
              type="submit"
              className="board-button board-setup-submit"
              disabled={isSubmittingSetup}
            >
              {isSubmittingSetup ? 'Saving...' : 'Continue'}
            </button>
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
        <button type="button" className="board-button" onClick={() => void handleShare()}>
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
                  className="board-task-button board-task-button-subtle"
                  onClick={() => void handleColumnDelete(column.id)}
                  aria-label={`Delete column ${column.name}`}
                >
                  Delete
                </button>
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
                        <button
                          type="button"
                          className="board-task-button board-task-button-subtle"
                          onClick={() => void handleTaskDelete(column.id, card.id)}
                        >
                          Delete
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

      {toastMessage && (
        <div className="board-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </main>
  )
}
