import { Bookmark, Navigation } from 'lucide-react';

export default function LessonNavigator({ chapters = [], currentChapterIndex = 0, bookmarks = [], onGoToChapter, onToggleBookmark }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30" aria-label="Lesson navigator">
      <div className="flex items-center gap-2 text-cyan-300">
        <Navigation className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.3em]">Lesson Navigator</p>
      </div>

      <div className="mt-3 space-y-2">
        {chapters.map((chapter, index) => {
          const active = index === currentChapterIndex;
          const bookmarked = bookmarks.includes(index);

          return (
            <div key={`${chapter.title}-${index}`} className={`flex items-center justify-between gap-2 rounded-xl border p-2 ${active ? 'border-cyan-400/30 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/70'}`}>
              <button type="button" onClick={() => onGoToChapter(index)} className="text-left text-sm text-white">
                {index + 1}. {chapter.title}
              </button>
              <button type="button" onClick={() => onToggleBookmark(index)} className={`rounded-md border px-2 py-1 text-xs ${bookmarked ? 'border-amber-400/40 bg-amber-500/20 text-amber-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`} aria-label="Toggle bookmark">
                <Bookmark className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
