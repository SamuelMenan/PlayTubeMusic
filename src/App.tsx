import './App.css'
import Library from './components/Library'
import Playlist from './components/Playlist'
import PlayerBar from './components/PlayerBar.tsx'
import type { Track } from './types'
import SearchBar from './components/SearchBar'

function App() {
  return (
    <div className="app layout-shell">
      <div className="topbar">
        <div className="brand">
          <img src="/Logo.png?v=1" alt="Logo" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/vite.svg' }} />
          <span className="brand-title">PlayTube Music</span>
        </div>
  <SearchBar />
      </div>
      <div className="columns">
        <aside className="left-pane">
          <Library onAdd={(t: Track, pos?: 'start' | 'end' | { index: number }) => window.playlistAdd?.(t, pos)} />
        </aside>
        <main className="right-pane">
          <Playlist />
        </main>
      </div>
      <PlayerBar />
    </div>
  )
}

export default App
