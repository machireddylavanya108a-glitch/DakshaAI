import { ArchiveRestore, DatabaseBackup } from 'lucide-react';

export default function BackupManager() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-violet-200"><DatabaseBackup className="h-5 w-5" /> Backup & restore</div>
      <p className="mt-3 text-sm text-slate-400">Control automatic backups, manual snapshots, restore points, and export workflows.</p>
    </div>
  );
}
