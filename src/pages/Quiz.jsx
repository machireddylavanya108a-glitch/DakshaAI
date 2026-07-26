import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Clock3, Sparkles, RotateCcw, Send, BookOpen, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateQuizEngine } from '../services/aiService';
import { saveQuizRecord, getUserQuizRecords, deleteQuizRecord } from '../services/firestoreService';
import { calculateQuizResult, parseQuizPayload } from '../utils/quizUtils';
import LoadingQuiz from '../components/quiz/LoadingQuiz';
import QuizHeader from '../components/quiz/QuizHeader';
import QuizProgress from '../components/quiz/QuizProgress';
import QuestionCard from '../components/quiz/QuestionCard';
import QuizResult from '../components/quiz/QuizResult';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed Difficulty'];
const QUESTION_COUNTS = [5, 10, 15, 20];

export default function Quiz() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTaken, setTimeTaken] = useState('0:00');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    getUserQuizRecords(user.uid).then(setHistory).catch(() => setHistory([]));
  }, [user]);

  useEffect(() => {
    if (!quiz || submitted) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const secondsPassed = Math.floor((Date.now() - startedAt) / 1000);
      setTimeLeft(secondsPassed);
      const mins = Math.floor(secondsPassed / 60);
      const secs = secondsPassed % 60;
      setTimeTaken(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz, submitted]);

  const answeredCount = useMemo(() => answers.filter((entry) => entry !== undefined && entry !== null && entry !== '').length, [answers]);

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic to generate a quiz.');
      return;
    }

    setLoading(true);
    setError('');
    setSubmitted(false);
    setAnswers([]);
    setCurrentIndex(0);
    try {
      const payload = await generateQuizEngine(topic.trim(), difficulty, questionCount);
      const parsed = parseQuizPayload(payload);
      setQuiz(parsed);
      setAnswers(Array(parsed.questions.length).fill(''));
    } catch (err) {
      console.error(err);
      setError('The quiz engine could not generate a quiz right now. Please try again.');
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (value) => {
    const next = [...answers];
    next[currentIndex] = value;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    if (!quiz || !user?.uid) return;
    const result = calculateQuizResult(answers, quiz.questions);
    setSubmitted(true);
    await saveQuizRecord(user.uid, topic, difficulty, quiz, result, timeTaken);
    const refreshed = await getUserQuizRecords(user.uid);
    setHistory(refreshed);
  };

  const handleRetake = async (record) => {
    setTopic(record.topic || '');
    setDifficulty(record.difficulty || 'Medium');
    setQuiz(record.quiz || null);
    setAnswers(Array((record.quiz?.questions || []).length).fill(''));
    setCurrentIndex(0);
    setSubmitted(false);
  };

  const handleDelete = async (id) => {
    if (!user?.uid) return;
    await deleteQuizRecord(user.uid, id);
    const refreshed = await getUserQuizRecords(user.uid);
    setHistory(refreshed);
  };

  const progress = quiz ? ((currentIndex + 1) / quiz.questions.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-indigo-950/50 to-cyan-950/50 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Professional AI Quiz Generator</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Create expert quizzes for any topic</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Generate multiple-choice, true/false, fill-in-the-blank, match, and short-answer questions with explanations and results.</p>
          </div>
          <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
            <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> AI-powered learning</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <label className="mb-2 block text-sm text-slate-300">Topic</label>
            <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. React Hooks" className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-white outline-none" />
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <label className="mb-2 block text-sm text-slate-300">Difficulty</label>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-white outline-none">
              {DIFFICULTIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <label className="mb-2 block text-sm text-slate-300">Number of Questions</label>
            <select value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-white outline-none">
              {QUESTION_COUNTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <button onClick={handleGenerateQuiz} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 font-semibold text-white transition hover:opacity-90">
              <Sparkles className="h-4 w-4" /> Generate Quiz
            </button>
          </div>
        </div>

        {error && <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      </div>

      {loading && <LoadingQuiz />}

      {!loading && quiz && !submitted && (
        <div className="space-y-4">
          <QuizHeader title={quiz.title} difficulty={quiz.difficulty} topic={topic} progress={progress} currentIndex={currentIndex} totalQuestions={quiz.questions.length} />
          <QuizProgress currentIndex={currentIndex} totalQuestions={quiz.questions.length} answeredCount={answeredCount} />
          <QuestionCard question={quiz.questions[currentIndex]} currentAnswer={answers[currentIndex] || ''} onSelect={handleSelectAnswer} index={currentIndex} total={quiz.questions.length} answered={Boolean(answers[currentIndex])} />

          <div className="flex flex-wrap gap-3">
            <button onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))} className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200">Previous</button>
            <button onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, quiz.questions.length - 1))} className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200">Next</button>
            <button onClick={handleSubmit} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white">Submit Quiz</button>
            <button onClick={() => { setQuiz(null); setAnswers([]); setCurrentIndex(0); setSubmitted(false); }} className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200">Restart</button>
          </div>
        </div>
      )}

      {!loading && submitted && quiz && (
        <QuizResult result={calculateQuizResult(answers, quiz.questions)} quiz={quiz} timeTaken={timeTaken} onRestart={() => { setSubmitted(false); setAnswers(Array(quiz.questions.length).fill('')); setCurrentIndex(0); }} />
      )}

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
        <div className="flex items-center gap-2 text-lg font-semibold text-white"><History className="h-5 w-5" /> Quiz History</div>
        <div className="mt-4 grid gap-3">
          {history.length === 0 ? <p className="text-sm text-slate-400">No quizzes saved yet.</p> : history.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
              <div>
                <p className="font-medium text-white">{item.topic}</p>
                <p className="text-sm text-slate-400">{item.difficulty} • {item.score}/{item.total} • {item.percentage}%</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRetake(item)} className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200">Retake</button>
                <button onClick={() => handleDelete(item.id)} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
