import { BarChart3, TrendingUp, Activity } from 'lucide-react';

export default function AnalyticsDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        { label: 'Active users', value: '18.4k', icon: Activity },
        { label: 'Retention', value: '73%', icon: TrendingUp },
        { label: 'Learning hours', value: '128k', icon: BarChart3 },
      ].map((item) => (
        <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400"><item.icon className="h-4 w-4 text-cyan-300" /> {item.label}</div>
          <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
