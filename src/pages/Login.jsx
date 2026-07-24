import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md text-center">
        <Brain className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Login to Daksha AI</h2>
        <p className="text-slate-400 mb-6">Access the Universal Knowledge OS.</p>
        <button 
          onClick={handleLogin}
          className="w-full bg-indigo-600 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
