import { Activity, Sparkles, ShieldCheck, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-slate-900/80 to-violet-500/10 p-6 shadow-xl shadow-cyan-900/20">
        <div className="flex items-center gap-3 text-cyan-200">
          <Sparkles className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Executive Command Center</h2>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">Monitor the enterprise learning platform with premium analytics, secure controls, and real-time operations visibility.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Active users', value: '18.4k', icon: Activity },
          { label: 'AI usage', value: '94.2%', icon: TrendingUp },
          { label: 'Security score', value: 'A+', icon: ShieldCheck },
        ].map((item) => (
          <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <item.icon className="h-4 w-4 text-cyan-300" /> {item.label}
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
