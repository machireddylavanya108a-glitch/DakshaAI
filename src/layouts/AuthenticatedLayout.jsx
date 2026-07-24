import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Sidebar from '../components/Sidebar.jsx'

export default function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="order-2 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40 lg:order-1">
          <Sidebar />
        </aside>

        <section className="order-1 lg:order-2">
          <Navbar />
          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  )
}
