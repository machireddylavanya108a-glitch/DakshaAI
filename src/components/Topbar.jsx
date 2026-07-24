import { Search, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Topbar() {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-40 flex items-center justify-between px-8">
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 w-96">
        <Search className="w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search Daksha AI..." className="bg-transparent text-white outline-none text-sm w-full" />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-slate-900">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full"></span>
        </button>
        <Link to="/profile">
          {user?.photoURL ? <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-full border border-slate-700" /> : <div className="w-9 h-9 rounded-full bg-slate-700" />}
        </Link>
      </div>
    </header>
  );
}
