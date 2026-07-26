import { DollarSign, CreditCard } from 'lucide-react';

export default function RevenueDashboard() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-emerald-200"><DollarSign className="h-5 w-5" /> Revenue intelligence</div>
      <p className="mt-3 text-sm text-slate-400">Monitor revenue, invoices, churn, and plan performance in a single control surface.</p>
    </div>
  );
}
