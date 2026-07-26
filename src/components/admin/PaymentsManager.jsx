import { CreditCard, Receipt } from 'lucide-react';

export default function PaymentsManager() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-emerald-200"><CreditCard className="h-5 w-5" /> Payments & invoices</div>
      <p className="mt-3 text-sm text-slate-400">Review transactions, refunds, coupon usage, and invoice history.</p>
    </div>
  );
}
