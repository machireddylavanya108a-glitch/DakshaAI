import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const adminEmail = "nomis108a@gmail.com";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading Daksha AI...
      </div>
    );
  }

  if (!user || user.email !== adminEmail) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
