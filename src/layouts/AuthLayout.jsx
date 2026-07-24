import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">Daksha AI</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Build with AI, deploy with confidence</h1>
          </div>
        </header>
        <main className="grow rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
