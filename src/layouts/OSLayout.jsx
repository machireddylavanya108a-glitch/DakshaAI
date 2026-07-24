import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function OSLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <Topbar />
      <main className="ml-64 pt-16 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
