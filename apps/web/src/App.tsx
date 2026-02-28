import { useEffect, useState } from 'react'
import skullIcon from './assets/skull-icon.png'
import './App.css'

type RecentTaskListSummary = {
  id: string
  name: string
  taskCount: number
  updatedLabel: string
}

type RecentTaskListCookieEntry = {
  id: string
  name: string
}

const placeholderRecentLists: RecentTaskListCookieEntry[] = [
  { id: 'lorem', name: 'Lorem' },
  { id: 'ipsum', name: 'Ipsum' },
  { id: 'dolar', name: 'Dolar' },
]

// Cookies constants
const RECENT_LISTS_COOKIE = 'dst_recent_lists'
const RECENT_LISTS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Reads one cookie value by key from document.cookie
 * @param name the key value of the cookie
 * @returns the cookie value
 */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const key = `${name}=`
  const cookie = document.cookie
    .split('; ')
    .find((cookiePart) => cookiePart.startsWith(key))

  return cookie ? cookie.slice(key.length) : null
}

/**
 * Checks that the document cookie is in the correct recent lists value
 * @param value document cookie to inspect
 * @returns Bool has the correct labels.
 */
function isRecentTaskListCookieEntry(value: unknown): value is RecentTaskListCookieEntry {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<RecentTaskListCookieEntry>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string'
  )
}

/**
 * Extracts the recently used lists from user cookies
 * @returns
 */
function loadRecentListsFromCookie(): RecentTaskListCookieEntry[] {
  try {
    const rawCookieValue = readCookie(RECENT_LISTS_COOKIE)
    if (!rawCookieValue) return placeholderRecentLists

    const parsed = JSON.parse(decodeURIComponent(rawCookieValue))
    if (!Array.isArray(parsed)) return placeholderRecentLists

    return parsed.filter(isRecentTaskListCookieEntry)
  } catch {
    return placeholderRecentLists
  }
}

function saveRecentListsToCookie(recentLists: RecentTaskListCookieEntry[]): void {
  if (typeof document === 'undefined') return

  const cookiePayload = recentLists.map(({ id, name }) => ({ id, name }))
  const encodedValue = encodeURIComponent(JSON.stringify(cookiePayload))
  document.cookie = `${RECENT_LISTS_COOKIE}=${encodedValue}; Max-Age=${RECENT_LISTS_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
}

function formatTaskCount(taskCount: number | null): string {
  if (taskCount === null) return 'Loading...'
  return `${taskCount} task${taskCount === 1 ? '' : 's'}`
}

function App() {
  const [showBoard, setShowBoard] = useState(false)
  const [recentLists] = useState<RecentTaskListCookieEntry[]>(() => loadRecentListsFromCookie())
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
