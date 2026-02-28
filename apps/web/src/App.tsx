// import { useState } from 'react'
import reactLogo from './assets/skull-icon.png'
import './App.css'

function App() {
  // const [count, setCount] = useState(0)

  return (
    <div className="page-layout">
      <section className="left-pane">
        <div className="brand-row">
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo" alt="React logo" />
          </a>
        </div>
        <h1 className="app-title">The Dead Simple<br />Task List</h1>
        <p className="intro">Simple, clean Kanban for the people who don't f**k around. </p>
        <div className="card">
          <div className="card-row">
            <button onClick={() => {}}>
              Make Your List
            </button>
            {/* <span className="helper-text">Quick interaction demo</span> */}
          </div>
          <p>
            Lorum Ipsum al dolorum penile algomothm.
          </p>
        </div>
        <p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
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
