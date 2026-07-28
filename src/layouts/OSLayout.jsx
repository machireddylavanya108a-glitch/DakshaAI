import { memo, useCallback, useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Home, Compass, BookOpen, Sparkles, User } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const OSLayout = memo(function OSLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  const handleMenuClick = useCallback(() => setSidebarOpen(true), []);
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }, [installPrompt]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 pointer-events-auto md:hidden" onClick={handleCloseSidebar} />}

      <div className={`fixed left-0 top-0 z-50 h-screen transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <Sidebar closeSidebar={handleCloseSidebar} />
      </div>

      <Topbar onMenuClick={handleMenuClick} />
      <main className="min-h-screen pt-16 pb-24 md:ml-64 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-around px-2 py-2">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] text-slate-400 hover:bg-slate-900 hover:text-white">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <Link to="/learn" className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] text-slate-400 hover:bg-slate-900 hover:text-white">
            <Compass className="h-4 w-4" />
            <span>Learn</span>
          </Link>
          <Link to="/academy" className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] text-slate-400 hover:bg-slate-900 hover:text-white">
            <BookOpen className="h-4 w-4" />
            <span>Academy</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] text-slate-400 hover:bg-slate-900 hover:text-white">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Link>
        </div>
      </nav>

      <button
        aria-label="Open AI assistant"
        className="fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/90 text-white shadow-lg shadow-cyan-500/20 transition-transform hover:scale-105 md:bottom-6"
        onClick={() => window.location.assign('/chat')}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {installPrompt ? (
        <div className="fixed inset-x-4 bottom-20 z-[60] rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-3 shadow-xl shadow-slate-950/40 md:bottom-6 md:left-auto md:right-24 md:w-80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Install Daksha AI</p>
              <p className="mt-1 text-xs text-slate-400">Use the app like a native experience with offline access and faster launches.</p>
            </div>
            <button onClick={handleInstall} className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-white">Install</button>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default OSLayout;
