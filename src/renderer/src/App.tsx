import { useState } from 'react'
import { AmbientBackground } from './components/AmbientBackground'
import { SessionDialogs } from './components/SessionDialogs'
import { Sidebar } from './components/Sidebar'
import { Toaster } from './components/Toaster'
import { routeKey, type Route } from './lib/navigation'
import { Dashboard } from './pages/Dashboard'
import { ProjectDetail } from './pages/ProjectDetail'
import { Projects } from './pages/Projects'
import { Settings } from './pages/Settings'

function App(): React.JSX.Element {
  const [route, navigate] = useState<Route>({ page: 'dashboard' })

  return (
    <div className="grain relative isolate flex h-full">
      <AmbientBackground />
      <Sidebar route={route} navigate={navigate} />
      {/* key remounts the page so its entrance animation replays on navigation */}
      <main key={routeKey(route)} className="flex-1 overflow-auto p-10">
        {route.page === 'dashboard' && <Dashboard navigate={navigate} />}
        {route.page === 'projects' && <Projects navigate={navigate} />}
        {route.page === 'project' && <ProjectDetail id={route.id} navigate={navigate} />}
        {route.page === 'settings' && <Settings />}
      </main>
      <SessionDialogs />
      <Toaster />
    </div>
  )
}

export default App
