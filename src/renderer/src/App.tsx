import { useState } from 'react'
import { AmbientBackground } from './components/AmbientBackground'
import { ClaudeInstallDialog } from './components/ClaudeInstallDialog'
import { SessionDialogs } from './components/SessionDialogs'
import { Sidebar } from './components/Sidebar'
import { TerminalDock } from './components/TerminalDock'
import { Toaster } from './components/Toaster'
import { useActiveSession } from './hooks/useActiveSession'
import { useClaudeFocus } from './hooks/useClaude'
import { useDockShortcut } from './hooks/useTerminals'
import { useTide } from './hooks/useTide'
import { routeKey, type Route } from './lib/navigation'
import { Dashboard } from './pages/Dashboard'
import { ProjectDetail } from './pages/ProjectDetail'
import { Projects } from './pages/Projects'
import { Settings } from './pages/Settings'

function App(): React.JSX.Element {
  const [route, navigate] = useState<Route>({ page: 'dashboard' })
  const { active } = useActiveSession()
  useDockShortcut()
  useClaudeFocus(navigate)
  const { level } = useTide()

  // New terminals default to the project you're looking at, else the one you're working on.
  const contextProjectId = route.page === 'project' ? route.id : (active?.projectId ?? null)

  return (
    <div className="grain relative isolate flex h-full">
      <AmbientBackground tide={level} />
      <Sidebar route={route} navigate={navigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* key remounts the page so its entrance animation replays on navigation */}
        <main key={routeKey(route)} className="min-h-0 flex-1 overflow-auto p-10">
          {route.page === 'dashboard' && <Dashboard navigate={navigate} />}
          {route.page === 'projects' && <Projects navigate={navigate} />}
          {route.page === 'project' && <ProjectDetail id={route.id} navigate={navigate} />}
          {route.page === 'settings' && <Settings />}
        </main>
        <TerminalDock contextProjectId={contextProjectId} />
      </div>
      <SessionDialogs />
      <ClaudeInstallDialog />
      <Toaster />
    </div>
  )
}

export default App
