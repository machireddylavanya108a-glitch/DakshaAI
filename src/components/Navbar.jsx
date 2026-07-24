import { Moon, Sun, LogOut } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { signOut } = useAuth()

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-slate-950/20 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Welcome back</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Daksha AI Dashboard</h2>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-4 text-slate-200 transition hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="ml-2 text-sm">Theme</span>
        </button>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-800 bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  )
}
