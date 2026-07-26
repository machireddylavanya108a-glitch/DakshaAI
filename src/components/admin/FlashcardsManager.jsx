import { ClipboardList, Sparkles } from 'lucide-react';

export default function FlashcardsManager() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-violet-200"><ClipboardList className="h-5 w-5" /> Flashcard library</div>
      <p className="mt-3 text-sm text-slate-400">Curate spaced repetition decks, review quality, and publication status.</p>
    </div>
  );
}
