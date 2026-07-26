import { Crown, Shield, UserRound, MessageSquareMore } from 'lucide-react';

export default function RolesManager() {
  const roles = [
    { name: 'Super Admin', icon: Crown, access: 'Full platform control' },
    { name: 'Admin', icon: Shield, access: 'Manage operations and moderation' },
    { name: 'Teacher', icon: MessageSquareMore, access: 'Create and govern content' },
    { name: 'Student', icon: UserRound, access: 'Learn, practice, and earn' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {roles.map((role) => (
        <div key={role.name} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-cyan-200">
            <role.icon className="h-4 w-4" />
            <h3 className="font-semibold text-white">{role.name}</h3>
          </div>
          <p className="mt-3 text-sm text-slate-400">{role.access}</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">Custom roles and inherited permissions can be configured here.</div>
        </div>
      ))}
    </div>
  );
}
