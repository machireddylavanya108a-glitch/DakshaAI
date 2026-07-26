import { Compass } from 'lucide-react';

export default function CategoryBrowser() {
  const categories = ['Books', 'Research', 'Code', 'AI', 'Science', 'Business', 'Medicine', 'History', 'Art', 'Education'];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
        <Compass className="h-4 w-4" /> Category browser
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <div key={category} className="rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">{category}</div>
        ))}
      </div>
    </div>
  );
}
