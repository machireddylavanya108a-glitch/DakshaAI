import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="w-16 h-16 text-indigo-500 mb-6" />
      <h1 className="text-6xl font-extrabold mb-4">404</h1>
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-slate-400 mb-8 max-w-md">The knowledge you are looking for has not been uploaded to the Daksha Universal Brain yet.</p>
      <Link to="/" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors">
        <Home className="w-5 h-5" /> Back to Home
      </Link>
    </div>
  );
}
