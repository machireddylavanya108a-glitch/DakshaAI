import { memo } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Topbar = memo(function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-30 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-2">
        <button aria-label="Open navigation" onClick={onMenuClick} className="rounded-lg p-2 hover:bg-slate-900 md:hidden">
          <Menu className="h-5 w-5 text-slate-400" />
        </button>
        <div className="flex w-40 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 sm:w-56 md:w-96">
          <Search className="h-4 w-4 text-slate-500" />
          <input type="text" placeholder="Search Daksha AI..." className="w-full bg-transparent text-sm text-white outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button aria-label="Notifications" className="relative rounded-lg p-2 hover:bg-slate-900">
          <Bell className="h-5 w-5 text-slate-400" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-indigo-500"></span>
        </button>
        <Link to="/profile" aria-label="Open profile">
          {user?.photoURL ? (
            <img
              loading="lazy"
              decoding="async"
              src={user.photoURL}
              alt="User"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                event.currentTarget.parentElement?.querySelector('[data-avatar-fallback]')?.classList.remove('hidden');
              }}
              className="h-9 w-9 rounded-full border border-slate-700"
            />
          ) : null}
          <div data-avatar-fallback className={`hidden h-9 w-9 rounded-full bg-slate-700 ${user?.photoURL ? 'hidden' : ''}`} />
        </Link>
      </div>
    </header>
  );
});

export default Topbar;
