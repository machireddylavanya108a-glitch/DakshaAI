import { ShieldCheck, Bell, Globe2, Database } from 'lucide-react';

const settingsCards = [
  {
    title: 'Privacy and Security',
    description: 'Manage account privacy, session controls, and secure sign-in preferences.',
    icon: ShieldCheck,
  },
  {
    title: 'Notifications',
    description: 'Control reminders for learning goals, deadlines, and daily momentum updates.',
    icon: Bell,
  },
  {
    title: 'Language and Region',
    description: 'Choose your preferred learning language and localization behavior.',
    icon: Globe2,
  },
  {
    title: 'Data Controls',
    description: 'Review export options, retention windows, and synced learning history.',
    icon: Database,
  },
];

export default function SettingsPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Platform preferences and controls</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-400 sm:text-base">Configure how Daksha AI works for your learning workflow, privacy controls, and notifications.</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {settingsCards.map((item) => (
            <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-slate-900/75 p-5 shadow-xl shadow-slate-950/20">
              <div className="flex items-center gap-3 text-cyan-300">
                <item.icon className="h-5 w-5" />
                <p className="text-sm uppercase tracking-[0.2em]">{item.title}</p>
              </div>
              <p className="mt-3 text-sm text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
