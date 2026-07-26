import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brain, Home, Search, GraduationCap, MessageSquare, Box, User, LogOut, ShieldCheck, NotebookPen, BookOpen, FileText, FileStack, Presentation, Youtube, Globe2, Camera, Mic, BrainCircuit, FlaskConical, Target, Award, GitBranch } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ closeSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.email === 'nomis108a@gmail.com';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Universal Scanner', path: '/scanner', icon: Search },
    { name: 'Skill Academy', path: '/academy', icon: GraduationCap },
    { name: 'AI Quiz Generator', path: '/quiz', icon: NotebookPen },
    { name: 'AI Flashcards', path: '/flashcards', icon: BookOpen },
    { name: 'PDF Learning Engine', path: '/pdf-learning', icon: FileText },
    { name: 'DOCX Learning Engine', path: '/docx-learning', icon: FileStack },
    { name: 'PPT Learning Engine', path: '/ppt-learning', icon: Presentation },
    { name: 'YouTube Learning Engine', path: '/youtube-learning', icon: Youtube },
    { name: 'Website Learning Engine', path: '/website-learning', icon: Globe2 },
    { name: 'Camera OCR Learning', path: '/camera-learning', icon: Camera },
    { name: 'AI Voice Teacher', path: '/voice-teacher', icon: Mic },
    { name: 'Memory Brain', path: '/memory-dashboard', icon: BrainCircuit },
    { name: 'AI Teacher', path: '/app/teacher', icon: MessageSquare },
    { name: '3D Learning', path: '/3d-learning', icon: Box },
    { name: 'Virtual Labs', path: '/virtual-labs', icon: FlaskConical },
    { name: 'AI Tutor', path: '/ai-tutor', icon: Brain },
    { name: 'Practice Engine', path: '/practice', icon: Target },
    { name: 'Examinations', path: '/examinations', icon: NotebookPen },
    { name: 'Certificates', path: '/certificates', icon: Award },
    { name: 'AI Notes', path: '/ai-notes', icon: NotebookPen },
    { name: 'AI Mind Maps', path: '/mind-maps', icon: GitBranch },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 h-screen bg-slate-950 border-r border-slate-800 flex flex-col fixed left-0 top-0 z-50">
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
          <Link
            to="/admin"
            onClick={closeSidebar}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/admin') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="font-medium">Admin Control</span>
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Link to="/profile" onClick={closeSidebar} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-900 transition-colors mb-3">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          )}
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
}
