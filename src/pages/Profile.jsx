import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Globe, LogOut, Settings, ShieldCheck, KeyRound, Trash2, EyeOff, Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import { encryptSensitiveValue, decryptSensitiveValue } from '../utils/security';

export default function Profile() {
  const { user, logout, verifyEmail, role } = useAuth();
  const navigate = useNavigate();
  const [showSensitive, setShowSensitive] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      await verifyEmail();
      window.alert('Verification email sent.');
    } catch (error) {
      console.error(error);
    }
  };

  const maskedProfile = useMemo(() => ({
    email: user?.email ? encryptSensitiveValue(user.email) : '',
    role,
    status: user?.emailVerified ? 'Verified' : 'Pending verification'
  }), [role, user?.email, user?.emailVerified]);

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

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600/20 border border-red-600/50 text-red-400 px-4 py-2 rounded-lg hover:bg-red-600/30 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
          {!user?.emailVerified ? (
            <button onClick={handleVerifyEmail} className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-cyan-200">
              <ShieldCheck className="w-4 h-4" /> Verify Email
            </button>
          ) : null}
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-500" /> Privacy & Security
        </h3>
        <div className="space-y-4 text-sm text-slate-300">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-cyan-300" /> Sensitive data</span>
              <button onClick={() => setShowSensitive((value) => !value)} className="rounded-lg border border-slate-700 px-2 py-1 text-slate-300">
                {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-slate-400">Stored profile details are protected with client-side encryption helpers for sensitive values.</p>
            {showSensitive ? <p className="mt-3 break-all rounded-lg bg-slate-900 p-3 text-slate-200">{decryptSensitiveValue(maskedProfile.email) || 'No email available'}</p> : null}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Access level</span>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">{maskedProfile.role}</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-amber-300" /> Data controls</span>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-200">GDPR ready</span>
            </div>
            <p className="mt-2 text-slate-400">Account deletion and data export controls can be managed from the privacy center.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
