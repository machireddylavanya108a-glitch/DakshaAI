import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children }) {
  const authContext = useAuth();

  if (!authContext) {
    return <Navigate to="/login" replace />;
  }

  const { user, loading } = authContext;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading Daksha AI...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}
