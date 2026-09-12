import { AppProvider, useApp } from './context/AppContext.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import EleanorApp from './components/EleanorApp.jsx'
import MarcusApp from './components/MarcusApp.jsx'

function Router() {
  const { session } = useApp()
  if (!session) return <LoginScreen />
  return session.firstName.toLowerCase() === 'eleanor' ? <EleanorApp /> : <MarcusApp />
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
