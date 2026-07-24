import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Globe, LogOut, Settings } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white px-8 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Settings className="w-8 h-8 text-indigo-500" /> Profile & Settings
      </h1>

      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 mb-8">
        <div className="flex items-center gap-6 mb-6">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="User Avatar" className="w-20 h-20 rounded-full border-2 border-indigo-500" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-10 h-10" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{user?.displayName || 'Daksha Learner'}</h2>
            <p className="text-slate-400 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" /> {user?.email || 'No email found'}
            </p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-600/20 border border-red-600/50 text-red-400 px-4 py-2 rounded-lg hover:bg-red-600/30 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-500" /> Preferred Language
        </h3>
        <p className="text-slate-400 mb-4 text-sm">Select the language you want Daksha AI to teach you in.</p>
        <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500">
          <option>English</option>
          <option>Telugu</option>
          <option>Hindi</option>
          <option>Tamil</option>
          <option>Kannada</option>
          <option>Spanish</option>
          <option>Japanese</option>
          <option>Arabic</option>
        </select>
      </div>
    </div>
  );
}
