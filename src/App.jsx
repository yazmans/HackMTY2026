import { AppProvider, useApp } from './context/AppContext.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import UnlinkedApp from './components/UnlinkedApp.jsx'
import SeniorApp from './components/SeniorApp.jsx'
import CopilotApp from './components/CopilotApp.jsx'

function Router() {
  const { session, isLinked, enoFamilyRole, linkStatusLoading } = useApp()

  if (!session) return <LoginScreen />

  // Avoid flashing the unlinked flow while we check for a link left over
  // from a previous session (see AppContext's getLinkStatus effect).
  if (linkStatusLoading) {
    return <p className="p-6 text-sm text-gray-400">Cargando tu cuenta…</p>
  }

  // Features stay locked until the Eno Family handshake completes.
  if (!isLinked) return <UnlinkedApp />

  if (enoFamilyRole === 'senior') return <SeniorApp />
  if (enoFamilyRole === 'copilot') return <CopilotApp />

  return <UnlinkedApp />
}

export default function App() {
  return (
    <AppProvider>
      <div className="relative mx-auto w-[390px] h-[844px] bg-[#F4F6F8] border-[14px] border-black rounded-[3rem] shadow-2xl overflow-hidden flex flex-col font-sans">
        <Router />
      </div>
    </AppProvider>
  )
}
