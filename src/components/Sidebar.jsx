import { memo, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brain, Home, Search, GraduationCap, User, LogOut, ShieldCheck, BookOpen, BrainCircuit, Settings, LayoutGrid } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = memo(function Sidebar({ closeSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.email === 'nomis108a@gmail.com';

  const navItems = useMemo(() => [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Learn', path: '/learn', icon: Search },
    { name: 'Skill Academy', path: '/academy', icon: GraduationCap },
    { name: 'Knowledge Library', path: '/knowledge-library', icon: BookOpen },
    { name: 'Memory Brain', path: '/memory-dashboard', icon: BrainCircuit },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ], []);

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="flex h-screen w-[85vw] max-w-[18rem] flex-col border-r border-slate-800 bg-slate-950 fixed left-0 top-0 z-50 sm:w-72 md:w-64">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <Brain className="w-8 h-8 text-indigo-500" />
        <span className="text-2xl font-bold text-white">Daksha AI</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            onClick={closeSidebar}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive(item.path) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <Link
              to="/admin"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/admin') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="font-medium">Admin Control</span>
            </Link>
            <Link
              to="/admin-panel"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/admin-panel') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="font-medium">Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Link to="/profile" onClick={closeSidebar} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-900 transition-colors mb-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="User"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                event.currentTarget.parentElement?.querySelector('[data-avatar-fallback]')?.classList.remove('hidden');
              }}
              className="w-10 h-10 rounded-full"
            />
          ) : null}
          <div data-avatar-fallback className={`w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center ${user?.photoURL ? 'hidden' : ''}`}>
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.displayName || 'Learner'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </Link>

        <button
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
});

export default Sidebar;
