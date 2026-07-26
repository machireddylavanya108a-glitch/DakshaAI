import { useState } from 'react';
import { Sparkles, BookOpen } from 'lucide-react';

export default function Flashcard({ card, index, total, onToggleFlip, flipped }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900/90 via-indigo-950/50 to-cyan-950/50 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>Card {index + 1} / {total}</span>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">{card?.difficulty || 'Mixed'}</span>
      </div>

      <button onClick={onToggleFlip} className="group w-full text-left">
        <div className="relative min-h-[320px] rounded-[2rem] border border-slate-700/70 bg-slate-950/70 p-6 transition hover:border-indigo-400/40">
          <div className="absolute right-4 top-4 rounded-full border border-indigo-400/20 bg-indigo-500/10 p-2 text-indigo-200">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex h-full items-center justify-center">
            <div>
              <p className="mb-4 text-sm uppercase tracking-[0.3em] text-slate-500">{flipped ? 'Back' : 'Front'}</p>
              <h3 className="text-2xl font-semibold text-white">{flipped ? card?.back : card?.front}</h3>
              {card?.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {card.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-sm text-slate-300">{tag}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </button>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>Tap to flip</span>
        <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Study mode</span>
      </div>
    </div>
  );
}
