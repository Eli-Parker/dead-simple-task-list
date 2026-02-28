import { useEffect, useState } from 'react'
import skullIcon from './assets/skull-icon.png'
import {
  loadRecentListsFromCookie,
  saveRecentListsToCookie,
  type RecentTaskListCookieEntry,
} from './recentListsCookie'
import './App.css'

type RecentTaskListSummary = {
  id: string
  name: string
  taskCount: number
  updatedLabel: string
}

const placeholderRecentLists: RecentTaskListCookieEntry[] = [
  { id: 'lorem', name: 'Lorem' },
  { id: 'ipsum', name: 'Ipsum' },
  { id: 'dolar', name: 'Dolar' },
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

function App() {
  const [showBoard, setShowBoard] = useState(false)
  const [recentLists] = useState<RecentTaskListCookieEntry[]>(() => loadRecentListsFromCookie(placeholderRecentLists))
  const recentListSummariesById: Record<string, Pick<RecentTaskListSummary, 'taskCount' | 'updatedLabel'>> = {}

  useEffect(() => {
    saveRecentListsToCookie(recentLists)
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
                <p key={list.id} className="intro recent-item">
                  <span>{list.name}</span>
                  <span className="recent-item-center">{formatTaskCount(recentListSummariesById[list.id]?.taskCount ?? null)}</span>
                  <span className="recent-item-right">{recentListSummariesById[list.id]?.updatedLabel ?? 'Loading...'}</span>
                </p>
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
