import { BarChart3 } from 'lucide-react';

export default function CertificateAnalytics({ stats }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><BarChart3 className="h-4 w-4" /> Analytics</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">My Certificates: {stats.total}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Downloaded Certificates: {stats.downloaded}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Shared Certificates: {stats.shared}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Verified Certificates: {stats.verified}</div>
      </div>
    </div>
  );
}
