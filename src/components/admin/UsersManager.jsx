import { Search, UserCog, ShieldAlert, KeyRound } from 'lucide-react';

export default function UsersManager() {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">User Administration</h2>
            <p className="text-sm text-slate-400">Manage accounts, profile states, permissions, and learning progress.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200">
            <Search className="h-4 w-4" /> Search users
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { name: 'Ava Chen', role: 'Admin', status: 'Active', action: 'Edit profile' },
          { name: 'Mina Patel', role: 'Teacher', status: 'Suspended', action: 'Review access' },
          { name: 'Noah Silva', role: 'Student', status: 'Active', action: 'Reset password' },
          { name: 'Liam Osei', role: 'Enterprise', status: 'Pending', action: 'Verify' },
        ].map((user) => (
          <div key={user.name} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">{user.name}</h3>
                <p className="text-sm text-slate-400">{user.role}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs ${user.status === 'Suspended' ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{user.status}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">{user.action}</button>
              <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"><UserCog className="mr-1 inline h-4 w-4" />Manage</button>
              <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"><KeyRound className="mr-1 inline h-4 w-4" />Password</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
