import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { BrainCircuit, Sparkles, TimerReset, Trophy, BookOpen, ShieldCheck, Zap, History, CheckCircle2, AlertTriangle, Wand2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import ExamHome from '../components/exams/ExamHome';
import ExamGenerator from '../components/exams/ExamGenerator';
import ExamInstructions from '../components/exams/ExamInstructions';
import ExamSession from '../components/exams/ExamSession';
import AnswerReview from '../components/exams/AnswerReview';
import ExamResult from '../components/exams/ExamResult';
import ExamAnalytics from '../components/exams/ExamAnalytics';
import ExamHistory from '../components/exams/ExamHistory';
import CertificatePreview from '../components/exams/CertificatePreview';
import LoadingExam from '../components/exams/LoadingExam';

const STORAGE_KEY = 'daksha-exam-history';

function buildExamData(form) {
  const questionCount = form.mode === 'Practice Exam' ? 6 : form.mode === 'Mock Test' || form.mode === 'Final Examination' || form.mode === 'Adaptive Examination' ? 8 : 7;
  const typePool = ['MCQ', 'True/False', 'Fill in the Blanks', 'Short Answer', 'Long Answer', 'Numerical Problems', 'Coding Challenge', 'Case Study', 'Drawing'];
  const weight = form.difficulty === 'Expert' ? 15 : form.difficulty === 'Advanced' ? 12 : form.difficulty === 'Intermediate' ? 10 : 8;

  const questions = Array.from({ length: questionCount }, (_, index) => {
    const type = typePool[index % typePool.length];
    const promptTemplate = `${form.subject} • ${form.examType}`;

    const questionBase = {
      id: `q-${index + 1}`,
      type,
      difficulty: form.difficulty,
      marks: weight,
      prompt: `${type} question ${index + 1} for ${promptTemplate}`,
      hint: `Focus on the core concept and a practical example related to ${form.subject}.`,
      solution: `A well-structured explanation for ${form.subject} that shows reasoning and application.`,
      rubric: 'Show relevant concepts, reasoning, and clarity.'
    };

    switch (type) {
      case 'MCQ':
        return {
          ...questionBase,
          prompt: `Which option best explains a key principle of ${form.subject}?`,
          options: ['Core understanding with practical application', 'A random guess', 'A memorized phrase', 'An unrelated example'],
          answerKey: 'Core understanding with practical application',
          explanation: 'The strongest answer shows both conceptual clarity and practical relevance.'
        };
      case 'True/False':
        return {
          ...questionBase,
          prompt: `True or False: ${form.subject} can be mastered through structured practice and review.`,
          answerKey: 'True',
          explanation: 'Consistent practice improves understanding and problem-solving.'
        };
      case 'Fill in the Blanks':
        return {
          ...questionBase,
          prompt: `Complete the sentence: ${form.subject} requires ____ and ____ thinking.`,
          answerKey: 'structured, analytical',
          explanation: 'Strong performance depends on logic and practical insight.'
        };
      case 'Short Answer':
        return {
          ...questionBase,
          prompt: `Explain one real-world application of ${form.subject} in 2–3 sentences.`,
          answerKey: 'A clear explanation of how the concept is applied in practice.',
          explanation: 'The answer should connect the theory to a relevant real-world context.'
        };
      case 'Long Answer':
        return {
          ...questionBase,
          prompt: `Discuss the importance of ${form.subject} in a professional setting.`,
          answerKey: 'A structured discussion linking theory, practice, and impact.',
          explanation: 'Full credit requires depth, organization, and practical relevance.'
        };
      case 'Numerical Problems':
        return {
          ...questionBase,
          prompt: `If a learner solves 8 problems in 24 minutes, what is the average time per problem?`,
          answerKey: '3',
          explanation: '24 divided by 8 equals 3 minutes.'
        };
      case 'Coding Challenge':
        return {
          ...questionBase,
          prompt: `Write a small function that demonstrates a core idea of ${form.subject}.`,
          answerKey: 'function demo() { return true; }',
          explanation: 'The solution should reflect the key concept clearly and simply.'
        };
      case 'Case Study':
        return {
          ...questionBase,
          prompt: `A team is applying ${form.subject} in a project. What should they do first?`,
          answerKey: 'Define the goal and break the task into manageable steps.',
          explanation: 'Structured planning improves execution and learning.'
        };
      default:
        return {
          ...questionBase,
          prompt: `Sketch or describe a concept map for ${form.subject}.`,
          answerKey: 'A clear diagram or explanation of the core idea.',
          explanation: 'The answer should show understanding through visuals or structured reasoning.'
        };
    }
  });

  return {
    id: `exam-${Date.now()}`,
    title: `${form.examType} • ${form.subject}`,
    subject: form.subject,
    examType: form.examType,
    difficulty: form.difficulty,
    mode: form.mode,
    duration: form.duration,
    totalMarks: questions.reduce((sum, question) => sum + question.marks, 0),
    questions,
    markingScheme: `Each question is worth ${weight} marks with partial credit for strong reasoning.`,
    answerKey: questions.map((question) => ({ id: question.id, answer: question.answerKey })),
    hints: questions.map((question) => ({ id: question.id, hint: question.hint })),
    rubric: 'Clarity, accuracy, structure, and practical application are rewarded.',
    evaluationCriteria: 'Automatic scoring, partial credit, feedback, and improvement suggestions are generated after submission.',
    createdAt: new Date().toISOString()
  };
}

function evaluateAnswer(question, answer) {
  const text = String(answer || '').trim().toLowerCase();
  const correct = String(question.answerKey || '').trim().toLowerCase();
  const keywords = correct.split(/\s+/).filter(Boolean);

  if (!text) return { awarded: 0, feedback: 'No response provided.', suggestions: 'Try to explain the main idea and supporting points.' };

  if (question.type === 'MCQ' || question.type === 'True/False') {
    if (text === correct) return { awarded: question.marks, feedback: 'Correct selection.', suggestions: 'Great job. Keep the reasoning concise.' };
    return { awarded: 0, feedback: 'Selection does not match the best answer.', suggestions: 'Review the concept and try again.' };
  }

  if (question.type === 'Numerical Problems') {
    const numericAnswer = Number(text.replace(/[^0-9.-]/g, ''));
    const numericCorrect = Number(correct.replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(numericAnswer) && numericAnswer === numericCorrect) {
      return { awarded: question.marks, feedback: 'Correct calculation.', suggestions: 'Your arithmetic is solid.' };
    }
    return { awarded: Math.max(0, Math.round(question.marks * 0.5)), feedback: 'Close but not exact.', suggestions: 'Double-check the arithmetic and units.' };
  }

  if (question.type === 'Coding Challenge') {
    const hasFunction = text.includes('function') || text.includes('def') || text.includes('const');
    const hasReturn = text.includes('return') || text.includes('=>');
    if (hasFunction && hasReturn) {
      return { awarded: Math.round(question.marks * 0.9), feedback: 'The solution shows the intended structure.', suggestions: 'Add a more complete example if needed.' };
    }
    return { awarded: Math.round(question.marks * 0.4), feedback: 'The response is partial.', suggestions: 'Try to write a clearer function with a return value.' };
  }

  const matchCount = keywords.filter((keyword) => text.includes(keyword)).length;
  const partial = matchCount > 0 ? Math.round(question.marks * (0.5 + matchCount / (keywords.length * 2))) : 0;

  if (partial >= question.marks * 0.7) {
    return { awarded: question.marks, feedback: 'Strong answer with relevant content.', suggestions: 'This is a strong response. Keep the structure clear.' };
  }
  if (partial > 0) {
    return { awarded: partial, feedback: 'Partial credit earned.', suggestions: 'Add more relevant points or examples.' };
  }

  return { awarded: 0, feedback: 'The response needs more detail.', suggestions: 'Revise the answer around the core concept and supporting example.' };
}

export default function Examinations() {
  const { user } = useAuth();
  const [form, setForm] = useState({ subject: 'Artificial Intelligence', examType: 'Adaptive Examination', difficulty: 'Intermediate', mode: 'Practice Exam', duration: 45 });
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Ready to generate');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.uid) {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setHistory(stored);
        return;
      }

      try {
        const q = query(collection(db, 'examSessions'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const sessions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setHistory(sessions);
      } catch (error) {
        console.error('Unable to load exam history:', error);
        setOffline(true);
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setHistory(stored);
      }
    };

    loadHistory();
  }, [user?.uid]);

  useEffect(() => {
    if (!started || isPaused || !exam) return;
    const interval = setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [started, isPaused, exam]);

  const currentQuestion = exam?.questions?.[currentIndex] || null;
  const progressPercent = useMemo(() => {
    if (!exam?.questions?.length) return 0;
    return Math.round(((currentIndex + 1) / exam.questions.length) * 100);
  }, [currentIndex, exam]);

  const startExam = () => {
    const nextExam = buildExamData(form);
    setExam(nextExam);
    setAnswers({});
    setCurrentIndex(0);
    setStarted(true);
    setIsPaused(false);
    setReviewMode(false);
    setResult(null);
    setTimeLeft(Number(form.duration) * 60);
    setSaveStatus('Examination generated');
  };

  const handleAnswerChange = (value) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleSubmitExam = async () => {
    if (!exam) return;

    const results = exam.questions.map((question) => {
      const evaluation = evaluateAnswer(question, answers[question.id]);
      return { ...question, evaluation };
    });

    const scoredMarks = results.reduce((sum, item) => sum + (item.evaluation?.awarded || 0), 0);
    const percentage = Math.round((scoredMarks / exam.totalMarks) * 100);
    const analytics = {
      overallScore: scoredMarks,
      accuracy: Math.min(100, Math.round((scoredMarks / exam.totalMarks) * 100)),
      completionRate: Math.round((Object.keys(answers).length / exam.questions.length) * 100),
      timeAnalysis: `${Math.max(0, form.duration - Math.round((form.duration * 60 - timeLeft) / 60))} min used`,
      questionDifficulty: exam.difficulty,
      topicPerformance: `${exam.subject} • ${exam.mode}`,
      weakConcepts: percentage < 70 ? ['Concept clarity', 'Practical application', 'Reasoning depth'] : ['Continue refining strategy'],
      strongConcepts: percentage >= 70 ? ['Core understanding', 'Structured reasoning'] : ['Initial preparation'],
      recommendations: percentage >= 80 ? ['Keep practicing with more advanced variations.'] : ['Review the solutions and try a harder set next time.']
    };

    const entry = {
      userId: user?.uid || 'local',
      examType: exam.examType,
      subject: exam.subject,
      questions: exam.questions,
      answers,
      marks: scoredMarks,
      percentage,
      analytics,
      duration: form.duration,
      completed: true,
      createdAt: new Date()
    };

    setResult({ exam, results, analytics, percentage, scoredMarks, answers });
    setReviewMode(true);
    setStarted(false);
    setIsPaused(false);
    setSaveStatus('Saving results...');

    try {
      if (user?.uid) {
        await addDoc(collection(db, 'examSessions'), entry);
      }
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const nextHistory = [entry, ...stored].slice(0, 6);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
      setHistory(nextHistory);
      setSaveStatus('Results saved');
      setOffline(false);
    } catch (error) {
      console.error('Unable to save exam session:', error);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const nextHistory = [entry, ...stored].slice(0, 6);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
      setHistory(nextHistory);
      setOffline(true);
      setSaveStatus('Saved locally');
    }
  };

  const handleAutoSubmit = () => {
    if (!started) return;
    handleSubmitExam();
  };

  const previousExams = history.filter((entry) => entry.completed);
  const savedExams = history.filter((entry) => !entry.completed);

  if (loading) return <LoadingExam />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.2),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Universal AI Examination System</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Conduct any exam for any subject, skill, profession, or certification</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Generate adaptive exams dynamically, evaluate answers intelligently, and track performance with premium analytics.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI-generated assessment engine</div>
            </div>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Responses are being preserved locally and will sync when the connection is restored.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <ExamHome form={form} onChange={setForm} onStart={startExam} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <ExamGenerator exam={exam} onGenerate={startExam} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <ExamInstructions exam={exam} />
            </div>

            {exam && started ? (
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                <ExamSession
                  exam={exam}
                  currentIndex={currentIndex}
                  currentQuestion={currentQuestion}
                  answer={answers[currentQuestion?.id] || ''}
                  onAnswerChange={handleAnswerChange}
                  onNext={() => setCurrentIndex((value) => Math.min(value + 1, exam.questions.length - 1))}
                  onPrevious={() => setCurrentIndex((value) => Math.max(value - 1, 0))}
                  onPause={() => setIsPaused(true)}
                  onResume={() => setIsPaused(false)}
                  onSubmit={handleSubmitExam}
                  timeLeft={timeLeft}
                  isPaused={isPaused}
                  progressPercent={progressPercent}
                />
              </div>
            ) : null}

            {result ? (
              <div className="space-y-6">
                <ExamResult result={result} />
                <CertificatePreview result={result} />
                <AnswerReview result={result} />
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><Trophy className="h-4 w-4" /> Achievements</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {['Perfect Score', 'Top Performer', 'Fast Solver', 'Expert Level', 'Daily Streak', 'Challenge Winner'].map((item) => (
                  <div key={item} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">{item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <ExamAnalytics analytics={result?.analytics || { overallScore: 0, accuracy: 0, completionRate: 0, questionDifficulty: 'N/A', topicPerformance: 'Awaiting exam', weakConcepts: [], strongConcepts: [], recommendations: [] }} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <ExamHistory history={previousExams} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><BookOpen className="h-4 w-4" /> Dashboard Snapshot</div>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Upcoming Exams: 3</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Previous Exams: {previousExams.length}</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Saved Exams: {savedExams.length}</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Recommended Exams: Custom Adaptive Assessment</div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><ShieldCheck className="h-4 w-4" /> Status</div>
              <div className="mt-4 text-sm text-slate-400">{saveStatus}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
