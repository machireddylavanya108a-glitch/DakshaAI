import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, Mail, Lock, UserPlus, LogIn, Key } from 'lucide-react';

const authErrorMessages = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait and try again later.',
  'auth/user-disabled': 'This account has been disabled. Contact support if this is a mistake.',
  'auth/popup-closed-by-user': 'Google sign-in was canceled. Please try again.'
};

const getFriendlyAuthMessage = (error) => {
  if (!error) return 'Something went wrong. Please try again.';
  const code = error.code || '';
  return authErrorMessages[code] || error.message || 'Something went wrong. Please try again.';
};

export default function Login() {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);

    try {
      if (isSignup) {
        await signupWithEmail(email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(getFriendlyAuthMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setStatus('');
    setLoading(true);

    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(getFriendlyAuthMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setStatus('');

    if (!email.trim()) {
      setError('Enter your email address to reset your password.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setStatus('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(getFriendlyAuthMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md text-center">
        <Brain className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">{isSignup ? 'Create Account' : 'Login to Daksha AI'}</h2>
        <p className="text-slate-400 mb-6">Access the Universal Knowledge OS.</p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-4 text-left">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
            <Mail className="w-5 h-5 text-slate-400" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent text-white outline-none w-full"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
            <Lock className="w-5 h-5 text-slate-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-transparent text-white outline-none w-full"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {status && <p className="text-green-400 text-sm text-center">{status}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              'Please wait...'
            ) : isSignup ? (
              <><UserPlus className="w-5 h-5" /> Sign Up</>
            ) : (
              <><LogIn className="w-5 h-5" /> Login</>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-4 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.70 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.60 3.3-4.53 6.16-4.53z"/></svg>
          {loading ? 'Connecting...' : 'Sign in with Google'}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsSignup((current) => !current);
            setError('');
            setStatus('');
          }}
          className="text-sm text-slate-400 hover:text-indigo-400 transition-colors"
        >
          {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
        </button>

        {!isSignup && (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="mt-4 text-sm text-slate-300 hover:text-indigo-300 transition-colors flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" /> Forgot Password?
          </button>
        )}
      </div>
    </div>
  );
}
