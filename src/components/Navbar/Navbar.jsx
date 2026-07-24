import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Scan, GraduationCap, MessageSquare, Box, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user } = useAuth();
  const isAdmin = user?.email === "nomis108a@gmail.com";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-slate-950/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl py-3' : 'bg-slate-950/70 backdrop-blur-md py-4'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-white lg:px-12">
        <Link to="/" className="flex items-center gap-3">
          <Brain className="h-9 w-9 text-cyan-400" />
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Daksha AI</p>
            <span className="text-lg font-semibold text-white">Knowledge OS</span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link to="/scanner" className="flex items-center gap-2 text-slate-300 transition hover:text-cyan-300">
            <Scan className="h-4 w-4" /> Universal Scanner
          </Link>
          <Link to="/academy" className="flex items-center gap-2 text-slate-300 transition hover:text-cyan-300">
            <GraduationCap className="h-4 w-4" /> Skill Academy
          </Link>
          <Link to="/chat" className="flex items-center gap-2 text-slate-300 transition hover:text-cyan-300">
            <MessageSquare className="h-4 w-4" /> AI Teacher
          </Link>
          <Link to="/3d-learning" className="flex items-center gap-2 text-slate-300 hover:text-indigo-500 transition-colors">
            <Box className="w-4 h-4" /> 3D Learning
          </Link>          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
              <ShieldCheck className="w-4 h-4" /> Admin
            </Link>
          )}        </div>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-slate-300 transition hover:text-white">Login</Link>
          <Link to="/login" className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
