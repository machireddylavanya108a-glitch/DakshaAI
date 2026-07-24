import { StickyNote } from 'lucide-react';
export default function FlashcardCard({ flashcards }) {
  if (!flashcards || flashcards.length === 0) return null;
  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><StickyNote className="w-5 h-5 text-indigo-500" /> Flashcards</h3>
      <div className="space-y-3">
        {flashcards.map((card, i) => (
          <div key={i} className="bg-slate-800 p-4 rounded-lg">
            <p className="font-semibold text-indigo-400">{card.front}</p>
            <p className="text-slate-300 text-sm mt-1">{card.back}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
