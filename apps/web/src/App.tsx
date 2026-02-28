// import { useState } from 'react'
import skullIcon from './assets/skull-icon.png'
import './App.css'

function App() {
  // const [count, setCount] = useState(0)

  return (
    <div className="page-layout">
      <section className="left-pane">
        <div className="brand-row">
          <img src={skullIcon} className="skull-icon" alt="React logo" />
        </div>
        <h1 className="app-title">The Dead Simple<br />Task List</h1>
        <p className="intro">Simple, clean Kanban for the people who don't f**k around. </p>
        <div className="card">
          <div className="card-row">
            <button className="started-button" onClick={() => {}}>
              Get started
            </button>
            <span className="helper-text">or</span>
            <button className="recent-list-button" onClick={() => {}}>
              Open a recent list
            </button>
          </div>
          <p>
            Lorum Ipsum al dolorum penile algomothm.
          </p>
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
