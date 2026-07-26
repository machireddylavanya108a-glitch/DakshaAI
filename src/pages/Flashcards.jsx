import { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, Plus, BookOpen, History, Trash2, Copy, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateFlashcards } from '../services/aiService';
import { saveFlashcardDeck, getUserFlashcards, deleteFlashcardDeck } from '../services/firestoreService';
import { calculateFlashcardProgress, parseFlashcardPayload } from '../utils/flashcardUtils';
import LoadingFlashcards from '../components/flashcards/LoadingFlashcards';
import FlashcardHeader from '../components/flashcards/FlashcardHeader';
import FlashcardProgress from '../components/flashcards/FlashcardProgress';
import FlashcardControls from '../components/flashcards/FlashcardControls';
import FlashcardDeck from '../components/flashcards/FlashcardDeck';
import Flashcard from '../components/flashcards/Flashcard';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Mixed'];

export default function Flashcards() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deck, setDeck] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);
  const [savedDecks, setSavedDecks] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    getUserFlashcards(user.uid).then(setSavedDecks).catch(() => setSavedDecks([]));
  }, [user]);

  useEffect(() => {
    if (!deck) return;
    const timer = setInterval(() => setStudySeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [deck]);

  const progress = useMemo(() => calculateFlashcardProgress(deck?.flashcards || [], studySeconds), [deck, studySeconds]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic to generate flashcards.');
      return;
    }
    setLoading(true);
    setError('');
    setDeck(null);
    setCurrentIndex(0);
    setFlipped(false);
    setStudySeconds(0);

    try {
      const payload = await generateFlashcards(topic.trim(), difficulty);
      const parsed = parseFlashcardPayload(payload);
      setDeck(parsed);
      if (user?.uid) {
        await saveFlashcardDeck(user.uid, topic.trim(), difficulty, parsed);
        const refreshed = await getUserFlashcards(user.uid);
        setSavedDecks(refreshed);
      }
    } catch (err) {
      console.error(err);
      setError('The flashcard engine could not generate a deck right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleShuffle = () => {
    if (!deck?.flashcards?.length) return;
    const shuffled = [...deck.flashcards].sort(() => Math.random() - 0.5);
    setDeck((prev) => prev ? { ...prev, flashcards: shuffled } : prev);
    setCurrentIndex(0);
    setFlipped(false);
  };

  const markCurrent = (status) => {
    if (!deck?.flashcards?.length) return;
    const updated = [...deck.flashcards];
    updated[currentIndex] = { ...updated[currentIndex], status };
    setDeck((prev) => prev ? { ...prev, flashcards: updated } : prev);
  };

  const handleDelete = async (id) => {
    if (!user?.uid) return;
    await deleteFlashcardDeck(user.uid, id);
    const refreshed = await getUserFlashcards(user.uid);
    setSavedDecks(refreshed);
  };

  const handleLoad = (item) => {
    setDeck(item.deck || null);
    setCurrentIndex(0);
    setFlipped(false);
    setStudySeconds(0);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-indigo-950/50 to-cyan-950/50 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Professional AI Flashcards</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Turn any topic into a beautiful study deck</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Generate flashcards from a topic or learning source, flip each card, track progress, and save your favorite decks for later review.</p>
          </div>
          <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Smart spaced review</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <label className="mb-2 block text-sm text-slate-300">Search Topic</label>
            <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. JavaScript fundamentals" className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-white outline-none" />
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <label className="mb-2 block text-sm text-slate-300">Difficulty</label>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-white outline-none">
              {DIFFICULTIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <button onClick={handleGenerate} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 font-semibold text-white transition hover:opacity-90">
              <Sparkles className="h-4 w-4" /> Generate Flashcards
            </button>
          </div>
        </div>

        {error && <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      </div>

      {loading && <LoadingFlashcards />}

      {!loading && deck && (
        <div className="space-y-4">
          <FlashcardHeader title={deck.title} category={deck.category} currentIndex={currentIndex} total={deck.flashcards.length} />
          <FlashcardProgress progress={progress} />
          <FlashcardDeck>
            <Flashcard card={deck.flashcards[currentIndex]} index={currentIndex} total={deck.flashcards.length} flipped={flipped} onToggleFlip={() => setFlipped((prev) => !prev)} />
          </FlashcardDeck>
          <FlashcardControls
            onPrev={() => { setCurrentIndex((prev) => Math.max(prev - 1, 0)); setFlipped(false); }}
            onNext={() => { setCurrentIndex((prev) => Math.min(prev + 1, deck.flashcards.length - 1)); setFlipped(false); }}
            onShuffle={handleShuffle}
            onRestart={() => { setCurrentIndex(0); setFlipped(false); }}
            onMarkKnown={() => markCurrent('known')}
            onNeedsReview={() => markCurrent('review')}
            onBookmark={() => { const updated = [...deck.flashcards]; updated[currentIndex] = { ...updated[currentIndex], bookmarked: !updated[currentIndex].bookmarked }; setDeck((prev) => prev ? { ...prev, flashcards: updated } : prev); }}
            onFavorite={() => { const updated = [...deck.flashcards]; updated[currentIndex] = { ...updated[currentIndex], favorite: !updated[currentIndex].favorite }; setDeck((prev) => prev ? { ...prev, flashcards: updated } : prev); }}
            onReviewLater={() => markCurrent('later')}
            currentCard={deck.flashcards[currentIndex]}
          />
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
        <div className="flex items-center gap-2 text-lg font-semibold text-white"><History className="h-5 w-5" /> My Flashcards</div>
        <div className="mt-4 grid gap-3">
          {savedDecks.length === 0 ? <p className="text-sm text-slate-400">No saved decks yet.</p> : savedDecks.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
              <div>
                <p className="font-medium text-white">{item.topic}</p>
                <p className="text-sm text-slate-400">{item.difficulty} • {item.deck?.flashcards?.length || 0} cards</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleLoad(item)} className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200">Continue</button>
                <button onClick={() => handleDelete(item.id)} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"><Trash2 className="mr-2 inline h-4 w-4" />Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
