import { useEffect, useState } from 'react'
import skullIcon from './assets/skull-icon.png'
import {
  loadRecentListsFromStorage,
  saveRecentListsToStorage,
  type RecentTaskListStorageEntry,
} from './recentListsStorage'
import './App.css'

type RecentTaskListSummary = {
  taskCount: number
  updatedLabel: string
}

const placeholderRecentLists: RecentTaskListStorageEntry[] = [
  { id: 'lorem', title: 'Lorem', boardId: 'lorem' },
  { id: 'ipsum', title: 'Ipsum', boardId: 'ipsum' },
  { id: 'dolar', title: 'Dolar', boardId: 'dolar' },
]

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
 * Creates a board URL using the board ID in the query string segment.
 *
 * Example: `/?board-123`.
 *
 * @param boardId Board ID for navigation.
 * @returns Board URL with board ID query string segment.
 */
function createBoardLink(boardId: string): string {
  return `/board?${encodeURIComponent(boardId)}`
}

function App() {
  const [showBoard, setShowBoard] = useState(false)
  const [recentLists] = useState<RecentTaskListStorageEntry[]>(() => loadRecentListsFromStorage(placeholderRecentLists))
  const recentListSummariesByBoardId: Record<string, RecentTaskListSummary> = {}

  useEffect(() => {
    saveRecentListsToStorage(recentLists)
  }, [recentLists])

  return (
    <div className="page-layout">
      <section className="left-pane">
        <div className="brand-row">
          <img src={skullIcon} className="skull-icon" alt="React logo" />
        </div>
        <h1 className="app-title">The Dead Simple<br />Task List</h1>
        <div className="stage">
          <section className={`screen intro-screen ${showBoard ? 'exit' : ''}`}>
            <div className="body">
              <p className="intro">Simple, clean Kanban for the people who don't f**k around. </p>
              <div className="card">
                <div className="card-row">
                  <button className="started-button">
                    Get started
                  </button>
                  <span className="helper-text">or</span>
                  <button className="recent-list-button" onClick={() => setShowBoard(true)}>
                    Open a recent list
                  </button>
                </div>
                <p>
                  Lorum Ipsum al dolorum penile algomothm.
                </p>
              </div>
            </div>
          </section>

          <section className={`screen board-screen ${showBoard ? 'enter' : 'start'}`}>
            <div className="card board-card">
              <h2 className="board-title">Recents</h2>
              {recentLists.map((list) => (
                <a key={list.id} href={createBoardLink(list.boardId)} className="intro recent-item recent-item-link">
                  <span>{list.title}</span>
                  <span className="recent-item-center">{formatTaskCount(recentListSummariesByBoardId[list.boardId]?.taskCount ?? null)}</span>
                  <span className="recent-item-right">{recentListSummariesByBoardId[list.boardId]?.updatedLabel ?? 'Loading...'}</span>
                </a>
              ))}
              <button className="recent-list-button" onClick={() => setShowBoard(false)}>
                Back
              </button>
            </div>
          </section>
        </div>
      </section>

      <aside className="right-pane">
        <div className="right-pane-content">
          <h2>Organize:</h2>
          <ul className="organize-list">
            <li>Hackathons</li>
            <li>Work projects</li>
            <li>Anything you want!</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

export default App
