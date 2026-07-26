import { Award, ShieldCheck } from 'lucide-react';

export default function CertificatesManager() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-amber-200"><Award className="h-5 w-5" /> Certificates & credentials</div>
      <p className="mt-3 text-sm text-slate-400">Issue, verify, and track achievement credentials across user cohorts.</p>
    </div>
  );
}
