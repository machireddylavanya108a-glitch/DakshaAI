import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Scan, BookOpen, MessageSquare, LogOut } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white px-8 py-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold">Welcome, {user?.displayName || 'Learner'}</h1>
          <p className="text-slate-400 mt-2">What do you want to explore in Daksha AI today?</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 hover:border-indigo-500 transition-colors cursor-pointer">
          <Scan className="w-10 h-10 text-indigo-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Universal Scanner</h3>
          <p className="text-slate-400">Upload images, diagrams, or notes and get instant AI explanations.</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 hover:border-indigo-500 transition-colors cursor-pointer">
          <BookOpen className="w-10 h-10 text-indigo-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Skill Academy</h3>
          <p className="text-slate-400">Generate learning roadmaps for new skills and save progress.</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 hover:border-indigo-500 transition-colors cursor-pointer">
          <MessageSquare className="w-10 h-10 text-indigo-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">AI Teacher</h3>
          <p className="text-slate-400">Ask Daksha questions and get guided answers, talk, or listen.</p>
        </div>
      </div>
    </div>
  );
}
