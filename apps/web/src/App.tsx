import { useState } from 'react'
import skullIcon from './assets/skull-icon.png'
import './App.css'

type RecentTaskListSummary = {
  id: string
  name: string
  taskCount: number
  updatedLabel: string
}

const placeholderRecentLists: RecentTaskListSummary[] = [
  { id: 'lorem', name: 'Lorem', taskCount: 4, updatedLabel: '2 days ago' },
  { id: 'ipsum', name: 'Ipsum', taskCount: 7, updatedLabel: '1 week ago' },
  { id: 'dolar', name: 'Dolar', taskCount: 2, updatedLabel: 'Archived' },
]

function formatTaskCount(taskCount: number): string {
  return `${taskCount} task${taskCount === 1 ? '' : 's'}`
}

function App() {
  const [showBoard, setShowBoard] = useState(false)
  // Placeholder state until recent lists are loaded from an external source.
  const [recentLists] = useState<RecentTaskListSummary[]>(placeholderRecentLists)

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
                  <button className="started-button" onClick={() => setShowBoard(true)}>
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
                  <span className="recent-item-center">{formatTaskCount(list.taskCount)}</span>
                  <span className="recent-item-right">{list.updatedLabel}</span>
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
