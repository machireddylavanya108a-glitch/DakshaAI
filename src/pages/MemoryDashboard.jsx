import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserMemoryProfile, saveUserMemoryProfile, deleteUserMemoryProfile } from '../services/firestoreService';
import { getUserPdfLearning, getUserDocxLearning, getUserPptLearning, getUserCameraLearning, getUserYouTubeLearning, getUserWebsiteLearning, getUserFlashcards, getUserQuizRecords, getUserVoiceLessons, getUserQuizScores, getUserInterviewHistory, getUserExerciseProgress } from '../services/firestoreService';
import LearningProfile from '../components/memory/LearningProfile';
import MemoryTimeline from '../components/memory/MemoryTimeline';
import Recommendations from '../components/memory/Recommendations';
import WeakConcepts from '../components/memory/WeakConcepts';
import Achievements from '../components/memory/Achievements';
import LoadingMemory from '../components/memory/LoadingMemory';
import { buildMemoryProfile, summarizeText } from '../utils/memoryUtils';

const EMPTY_PROFILE = {
  learningHistory: [],
  preferences: { language: 'English', teacherStyle: 'friendly', difficulty: 'balanced' },
  weakConcepts: [],
  strongConcepts: [],
  statistics: { totalStudyHours: 0, lessonsCompleted: 0, averageQuizScore: 0, learningStreak: 0, lastActivity: 'No activity yet' },
  recommendations: [],
  learningGoals: 'Revise weekly and practice one project every week.',
  memoryNotes: 'Build a personal learning brain with every new lesson and quiz result.',
};

export default function MemoryDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memoryNotes, setMemoryNotes] = useState('');
  const [learningGoals, setLearningGoals] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  const loadProfile = async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError('');
    try {
      const [saved, pdfs, docxs, ppts, cameras, yts, websites, flashcards, quizzes, voiceLessons, quizScores, interviews, exercises] = await Promise.all([
        getUserMemoryProfile(user.uid),
        getUserPdfLearning(user.uid),
        getUserDocxLearning(user.uid),
        getUserPptLearning(user.uid),
        getUserCameraLearning(user.uid),
        getUserYouTubeLearning(user.uid),
        getUserWebsiteLearning(user.uid),
        getUserFlashcards(user.uid),
        getUserQuizRecords(user.uid),
        getUserVoiceLessons(user.uid),
        getUserQuizScores(user.uid),
        getUserInterviewHistory(user.uid),
        getUserExerciseProgress(user.uid)
      ]);

      const history = [];
      const addEntry = (type, title, summary, timestamp) => history.push({ type, title, summary, timestamp });

      pdfs.forEach((item) => addEntry('PDF', item.fileName || 'PDF lesson', item.summary || item.lesson?.summary || 'Document studied', item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      docxs.forEach((item) => addEntry('DOCX', item.fileName || 'DOCX lesson', item.previewText || 'Document studied', item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      ppts.forEach((item) => addEntry('PPT', item.fileName || 'Presentation', item.summary || 'Presentation reviewed', item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      cameras.forEach((item) => addEntry('Camera OCR', item.imageName || 'Image', item.summary || item.lesson?.summary || 'OCR content learned', item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      yts.forEach((item) => addEntry('YouTube', item.videoTitle || 'YouTube lesson', item.summary || 'Video lesson reviewed', item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      websites.forEach((item) => addEntry('Website', item.title || item.url || 'Website lesson', item.summary || 'Web content studied', item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      flashcards.forEach((item) => addEntry('Flashcards', item.topic || 'Flashcard deck', `${(item.deck?.flashcards || []).length} cards studied`, item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      quizzes.forEach((item) => addEntry('Quiz', item.topic || 'Quiz session', `${item.percentage || 0}% score`, item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      voiceLessons.forEach((item) => addEntry('Voice', item.topic || 'Voice lesson', `${item.language || 'English'} • ${item.teacherMode || 'friendly'}`, item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      quizScores.forEach((item) => addEntry('Score', item.topic || 'Quiz score', `${item.score}/${item.total}`, item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      interviews.forEach((item) => addEntry('Interview', item.topic || 'Interview prep', item.category || 'Practice', item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : new Date().toLocaleString()));
      exercises.forEach((item) => addEntry('Practice', item.topic || 'Practice session', `${(item.exercises || []).length} exercises tracked`, item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleString() : new Date().toLocaleString()));

      const totalStudyHours = Math.round((pdfs.length + docxs.length + ppts.length + cameras.length + yts.length + websites.length + voiceLessons.length + flashcards.length + quizzes.length + quizScores.length + exercises.length) * 0.6 + quizzes.length * 0.2);
      const lessonsCompleted = history.length;
      const averageQuizScore = quizzes.length ? Math.round(quizzes.reduce((acc, item) => acc + (item.percentage || 0), 0) / quizzes.length) : 0;
      const lastActivity = history[0]?.timestamp || 'No activity yet';
      const learningStreak = Math.max(1, Math.min(30, Math.round((history.length || 1) / 3)));

      const textPool = history.map((entry) => `${entry.title} ${entry.summary}`).join(' ');
      const extractedWords = summarizeText(textPool).split(/\s+/).filter(Boolean);
      const topicCounts = new Map();
      extractedWords.forEach((word) => {
        if (word.length < 4) return;
        topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
      });
      const strongConcepts = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([word]) => word);
      const weakConcepts = averageQuizScore < 75 ? ['Review fundamentals', 'Practice one weak lesson', 'Revisit prior quizzes'] : ['Use spaced revision', 'Practice one new concept'];

      const recommendations = [
        `Revisit ${weakConcepts[0] || 'core fundamentals'} with a short revision session.`,
        `Practice one ${strongConcepts[0] || 'high-confidence'} concept through a quiz or flashcard deck.`,
        `Continue with a new lesson from your most recent topic: ${history[0]?.title || 'your recent activity'}.`
      ];

      const merged = buildMemoryProfile({
        ...(saved || EMPTY_PROFILE),
        learningHistory: history,
        preferences: {
          language: saved?.preferences?.language || 'English',
          teacherStyle: saved?.preferences?.teacherStyle || 'friendly',
          difficulty: saved?.preferences?.difficulty || 'balanced',
        },
        weakConcepts,
        strongConcepts,
        statistics: {
          totalStudyHours,
          lessonsCompleted,
          averageQuizScore,
          learningStreak,
          lastActivity,
        },
        recommendations,
        learningGoals: saved?.learningGoals || EMPTY_PROFILE.learningGoals,
        memoryNotes: saved?.memoryNotes || EMPTY_PROFILE.memoryNotes,
      });

      setProfile(merged);
      setMemoryNotes(merged.memoryNotes || '');
      setLearningGoals(merged.learningGoals || '');
      await saveUserMemoryProfile(user.uid, merged);
      setIsOffline(false);
    } catch (err) {
      console.error('Memory dashboard error:', err);
      setError('Unable to sync memory profile. Using local fallback.');
      setIsOffline(true);
      const fallback = buildMemoryProfile({ ...EMPTY_PROFILE, learningHistory: [] });
      setProfile(fallback);
      setMemoryNotes(fallback.memoryNotes || '');
      setLearningGoals(fallback.learningGoals || '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    loadProfile();
  }, [user?.uid]);

  const saveMemory = async () => {
    if (!user?.uid) return;
    try {
      const nextProfile = {
        ...profile,
        learningGoals,
        memoryNotes,
        preferences: profile.preferences || EMPTY_PROFILE.preferences,
        statistics: profile.statistics || EMPTY_PROFILE.statistics,
      };
      setProfile(nextProfile);
      await saveUserMemoryProfile(user.uid, nextProfile);
      setError('');
    } catch (err) {
      setError('Could not save memory edits.');
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${user?.uid || 'memory'}-profile.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      const nextProfile = buildMemoryProfile({ ...profile, ...imported, learningHistory: imported.learningHistory || profile.learningHistory });
      setProfile(nextProfile);
      setMemoryNotes(nextProfile.memoryNotes || '');
      setLearningGoals(nextProfile.learningGoals || '');
      await saveUserMemoryProfile(user.uid, nextProfile);
    } catch (err) {
      setError('Unable to import memory file.');
    }
  };

  const handleReset = async () => {
    if (!user?.uid) return;
    try {
      await deleteUserMemoryProfile(user.uid);
      setProfile(EMPTY_PROFILE);
      setMemoryNotes('');
      setLearningGoals('');
    } catch (err) {
      setError('Could not reset memory profile.');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">AI Memory Brain</p>
              <h1 className="mt-2 text-4xl font-semibold text-white">A personal learning memory that grows with every lesson</h1>
              <p className="mt-3 max-w-2xl text-slate-400">Daksha remembers your studied topics, activity, quiz performance, and preferences so every future lesson feels more tailored.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={saveMemory} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Save Memory</button>
              <button onClick={handleExport} className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-200">Export Memory</button>
              <label className="cursor-pointer rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-200">
                Import Memory
                <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={handleReset} className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">Reset Memory</button>
            </div>
          </div>
        </div>

        {error ? <div className="rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div> : null}
        {isOffline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Your profile is stored locally until sync is restored.</div> : null}

        {loading ? <LoadingMemory /> : (
          <>
            <LearningProfile profile={profile} />
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <MemoryTimeline history={profile.learningHistory || []} />
              <div className="space-y-6">
                <Recommendations items={profile.recommendations || []} />
                <WeakConcepts concepts={profile.weakConcepts || []} />
              </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
                <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Memory Notes</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Edit your personal brain notes</h3>
                <textarea value={memoryNotes} onChange={(event) => setMemoryNotes(event.target.value)} className="mt-4 min-h-[160px] w-full rounded-[1.25rem] border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200 outline-none" />
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
                <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Learning Goals</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Set your next milestones</h3>
                <textarea value={learningGoals} onChange={(event) => setLearningGoals(event.target.value)} className="mt-4 min-h-[160px] w-full rounded-[1.25rem] border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200 outline-none" />
              </div>
            </div>
            <Achievements profile={profile} />
          </>
        )}
      </div>
    </div>
  );
}
