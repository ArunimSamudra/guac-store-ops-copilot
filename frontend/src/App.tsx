import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import Priorities from './pages/Priorities'
import Ordering from './pages/Ordering'
import Production from './pages/Production'
import Copilot from './pages/Copilot'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

export default function App() {
  const clock = useClock()

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? 'bg-green-700 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top nav */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
                🥑 Riverside Fresh Market
              </span>
              <nav className="flex gap-1">
                <NavLink to="/" end className={navClass}>Priorities</NavLink>
                <NavLink to="/ordering" className={navClass}>Ordering</NavLink>
                <NavLink to="/production" className={navClass}>Production</NavLink>
                <NavLink to="/copilot" className={navClass}>Copilot</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 shrink-0">
              <span>{clock}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          <Routes>
            <Route path="/" element={<Priorities />} />
            <Route path="/ordering" element={<Ordering />} />
            <Route path="/production" element={<Production />} />
            <Route path="/copilot" element={<Copilot />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
