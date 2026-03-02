import { useEffect, useState } from 'react'
import skullIcon from './assets/skull-icon.png'
import taskListPreview from './assets/tl-preview.png'
import { getBoardSummaryByLink } from './apiHelpers'
import {
  loadRecentListsFromStorage,
  type RecentTaskListStorageEntry,
} from './recentListsStorage'
import './App.css'

type RecentTaskListSummary = {
  taskCount: number | null
  storedAtLabel: string
}

/**
 * Formats a task count label for display.
 *
 * @param taskCount Numeric task count or `null` while data is loading.
 * @returns Human-friendly count string.
 */
function formatTaskCount(taskCount: number | null): string {
  if (taskCount === null) return 'Loading...'
  return `${taskCount} task${taskCount === 1 ? '' : 's'}`
}

/**
 * Formats a stored-at timestamp into a readable date/time label.
 *
 * @param storedAt ISO timestamp from local storage.
 * @returns Human-friendly date label.
 */
function formatStoredAtLabel(storedAt: string | null): string {
  if (!storedAt) return 'Unknown date'

  const parsedDate = new Date(storedAt)
  if (Number.isNaN(parsedDate.getTime())) return 'Unknown date'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

/**
 * Creates a board URL using the board ID in the query string segment.
 *
 * Example: `/?board-123`.
 *
 * @param boardId Board ID for navigation.
 * @returns Board URL with board ID query string segment.
 */
function createBoardLink(boardId: string): string {
  return `/#/board?${encodeURIComponent(boardId)}`
}

function App() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  const [showBoard, setShowBoard] = useState(false)
  const [recentLists] = useState<RecentTaskListStorageEntry[]>(() => loadRecentListsFromStorage())
  const [recentListSummariesByBoardId, setRecentListSummariesByBoardId] = useState<Record<string, RecentTaskListSummary>>({})

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)')
    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    mediaQuery.addEventListener('change', handleMediaQueryChange)
    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange)
    }
  }, [])

  useEffect(() => {
    if (recentLists.length === 0) {
      return
    }

    let cancelled = false

    void (async () => {
      const entries = await Promise.all(
        recentLists.map(async (list) => {
          const summary = await getBoardSummaryByLink(list.boardId, list.storedAt)
          const nextSummary: RecentTaskListSummary = summary
            ? {
                taskCount: summary.taskCount,
                storedAtLabel: formatStoredAtLabel(summary.storedAt),
              }
            : {
                taskCount: null,
                storedAtLabel: formatStoredAtLabel(list.storedAt),
              }

          return [list.boardId, nextSummary] as const
        }),
      )

      if (cancelled) {
        return
      }

      setRecentListSummariesByBoardId(Object.fromEntries(entries))
    })()

    return () => {
      cancelled = true
    }
  }, [recentLists])

  return (
    <div className="app-page page-layout">
      <section className="left-pane">
        <div className="brand-row">
          <img src={skullIcon} className="skull-icon" alt="React logo" />
        </div>
        <h1 className="app-title">The Dead Simple<br />Task List</h1>
        <div className="stage">
          <section className={`screen intro-screen ${showBoard ? 'exit' : ''}`}>
            <div className="body">
              <p className="intro">Simple, clean Kanban for the people who don't mess around. </p>
              <div className="card">
                <div className="card-row">
                  <button
                    className="started-button"
                    type="button"
                    onClick={() => {
                      window.location.assign('/#/board')
                    }}
                  >
                    New Board
                  </button>
                  <span className="helper-text">or</span>
                  <button className="recent-list-button" onClick={() => setShowBoard(true)}>
                    Open a Recent Board
                  </button>
                </div>
                {/* <p>
                  Lorum Ipsum al dolorum penile algomothm.
                </p> */}
              </div>
            </div>
          </section>

          <section className={`screen board-screen ${showBoard ? 'enter' : 'start'}`}>
            <div className="card recent-board-card">
              <h2 className="recent-board-title">Recents</h2>
              {recentLists.length === 0 ? (
                <p className="recent-empty-message">No recent lists yet. Create a new board to get started.</p>
              ) : (
                recentLists.map((list) => (
                  <a key={list.boardId} href={createBoardLink(list.boardId)} className="intro recent-item recent-item-link">
                    <span>{list.title}</span>
                    <span className="recent-item-center">{formatTaskCount(recentListSummariesByBoardId[list.boardId]?.taskCount ?? null)}</span>
                    <span className="recent-item-right">{recentListSummariesByBoardId[list.boardId]?.storedAtLabel ?? 'Loading...'}</span>
                  </a>
                ))
              )}
              <button className="recent-list-button" onClick={() => setShowBoard(false)}>
                Back
              </button>
            </div>
          </section>
        </div>
      </section>

      {!isMobile && (
        <aside className="right-pane">
          <div className="right-pane-content">
            <h2>Organize:</h2>
            <ul className="organize-list">
              <li>Hackathons</li>
              <li>Work projects</li>
              <li>Anything you want!</li>
            </ul>
            <img
              className="preview-image"
              src={taskListPreview}
              alt="Task list board preview"
            />
          </div>
        </aside>
      )}
    </div>
  )
}

export default App
