import { Brain } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-slate-950/95 border-t border-slate-800 py-16 text-slate-300">
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_32%)]" />
      <div className="mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.8fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3 text-white">
              <Brain className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Daksha AI</p>
                <p className="text-2xl font-semibold">Universal Knowledge OS</p>
              </div>
            </div>
            <p className="max-w-xl text-slate-400">A premium platform for learning, mastery, and discovery with AI, 3D simulation, and multilingual teaching built for the next generation.</p>
          </div>

          <div>
            <h3 className="mb-5 text-sm uppercase tracking-[0.35em] text-cyan-300">Languages</h3>
            <ul className="grid gap-3 text-sm text-slate-400">
              {['English', 'Hindi', 'Telugu', 'Spanish', 'Arabic', 'Japanese', 'Chinese', 'French'].map((lang) => (
                <li key={lang}>{lang}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-sm uppercase tracking-[0.35em] text-cyan-300">Knowledge Library</h3>
            <ul className="grid gap-3 text-sm text-slate-400">
              <li>AI Training</li>
              <li>3D Simulation</li>
              <li>Skill Academy</li>
              <li>Expert Guides</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-sm uppercase tracking-[0.35em] text-cyan-300">Company</h3>
            <ul className="grid gap-3 text-sm text-slate-400">
              <li>About</li>
              <li>Careers</li>
              <li>Press</li>
              <li>Contact</li>
            </ul>
          </div>
        </div>

        <div className="grid gap-8 border-t border-white/10 pt-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Global Presence</p>
            <div className="mt-6 h-44 rounded-[2rem] border border-white/10 bg-slate-900/70" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Social</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
                <span className="cursor-pointer hover:text-white">Twitter</span>
                <span className="cursor-pointer hover:text-white">LinkedIn</span>
                <span className="cursor-pointer hover:text-white">Instagram</span>
                <span className="cursor-pointer hover:text-white">YouTube</span>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Legal</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-400">
                <span className="cursor-pointer hover:text-white">Privacy</span>
                <span className="cursor-pointer hover:text-white">Terms</span>
                <span className="cursor-pointer hover:text-white">Accessibility</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-slate-500">© 2024 Daksha AI. Universal Knowledge OS.</div>
    </footer>
  );
}
