import { RotateCcw, SkipBack, SkipForward, Shuffle, Bookmark, Star, CheckCircle2, RefreshCw } from 'lucide-react';

export default function FlashcardControls({ onPrev, onNext, onShuffle, onRestart, onMarkKnown, onNeedsReview, onBookmark, onFavorite, onReviewLater, currentCard }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={onPrev} className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200"> <SkipBack className="mr-2 inline h-4 w-4" /> Previous</button>
      <button onClick={onNext} className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200"> <SkipForward className="mr-2 inline h-4 w-4" /> Next</button>
      <button onClick={onShuffle} className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200"> <Shuffle className="mr-2 inline h-4 w-4" /> Shuffle</button>
      <button onClick={onRestart} className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200"> <RotateCcw className="mr-2 inline h-4 w-4" /> Restart</button>
      <button onClick={onMarkKnown} className="rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm text-emerald-200"> <CheckCircle2 className="mr-2 inline h-4 w-4" /> Mark Known</button>
      <button onClick={onNeedsReview} className="rounded-2xl bg-amber-500/20 px-4 py-3 text-sm text-amber-200"> <RefreshCw className="mr-2 inline h-4 w-4" /> Needs Review</button>
      <button onClick={onBookmark} className="rounded-2xl bg-sky-500/20 px-4 py-3 text-sm text-sky-200"> <Bookmark className="mr-2 inline h-4 w-4" /> Bookmark</button>
      <button onClick={onFavorite} className="rounded-2xl bg-pink-500/20 px-4 py-3 text-sm text-pink-200"> <Star className="mr-2 inline h-4 w-4" /> Favorite</button>
      <button onClick={onReviewLater} className="rounded-2xl bg-violet-500/20 px-4 py-3 text-sm text-violet-200"> Review Later</button>
    </div>
  );
}
