import { useEffect, useMemo, useState } from 'react';
import { Sparkles, BrainCircuit, Trophy, Target, ShieldCheck, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  buildAdaptiveDifficulty,
  buildAnalytics,
  buildSessionScoreCard,
  evaluatePracticeAnswer,
  generatePracticeSet,
  getCertificateReadiness
} from '../utils/practiceUtils';
import PracticeHome from '../components/practice/PracticeHome';
import PracticeSession from '../components/practice/PracticeSession';
import ProgressTracker from '../components/practice/ProgressTracker';
import WeakConcepts from '../components/practice/WeakConcepts';
import AIHints from '../components/practice/AIHints';
import PracticeHistory from '../components/practice/PracticeHistory';
import LoadingPractice from '../components/practice/LoadingPractice';
import {
  getUserPracticeResults,
  saveAssessmentHistory,
  saveLearningScore,
  savePracticeResult,
  savePracticeSession,
  saveQuestionBankEntry
} from '../services/firestoreService';
import { persistLearningSession } from '../services/learningSessionOrchestrator';

function extractLessonSnapshot() {
  try {
    const keys = Object.keys(localStorage || {});
    const sessionKeys = keys.filter((item) => item.startsWith('daksha:ai-teacher:session:'));
    const latestKey = sessionKeys.sort().at(-1);
    if (!latestKey) return null;
    const payload = JSON.parse(localStorage.getItem(latestKey) || '{}');
    return {
      topic: payload?.topic || 'General Lesson',
      weakConcepts: Array.isArray(payload?.weakTopics) ? payload.weakTopics : [],
      pastMistakes: Array.isArray(payload?.messages)
        ? payload.messages
          .filter((item) => item?.role === 'assistant' && /wrong|try again|review/i.test(item?.content || ''))
          .map((item) => item.content)
          .slice(0, 8)
        : []
    };
  } catch (error) {
    console.error('Unable to extract lesson snapshot:', error);
    return null;
  }
}

export default function PracticeMode() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('General Lesson');
  const [difficulty, setDifficulty] = useState('Adaptive');
  const [profile, setProfile] = useState({
    skillLevel: 'intermediate',
    ageGroup: 'adult',
    learningSpeed: 'normal'
  });
  const [practiceSet, setPracticeSet] = useState(() => generatePracticeSet({ lesson: 'General Lesson', difficulty: 'Adaptive' }));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [latestFeedback, setLatestFeedback] = useState(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState({ accuracy: 0, speed: 0, confidence: 0, completion: 0, weakTopics: [], strongTopics: [], learningScore: 0, improvement: 0 });
  const [scoreCard, setScoreCard] = useState({ accuracy: 0, speed: 0, confidence: 0, improvement: 0, weakTopics: [], strongTopics: [], learningScore: 0 });
  const [readiness, setReadiness] = useState('Needs Practice');
  const [lastSavedDifficulty, setLastSavedDifficulty] = useState('Adaptive');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.uid) return;
      try {
        const entries = await getUserPracticeResults(user.uid);
        setHistory(entries);
        setAnalytics(buildAnalytics(entries));
      } catch (error) {
        console.error('Unable to load practice sessions:', error);
        setOffline(true);
      }
    };

    loadHistory();
  }, [user?.uid]);

  const startSession = async ({ source = 'manual', topicOverride, weakConceptsOverride, pastMistakesOverride } = {}) => {
    const lessonTopic = topicOverride || topic || 'General Lesson';
    const nextSet = generatePracticeSet({
      lesson: lessonTopic,
      difficulty,
      skillLevel: profile.skillLevel,
      ageGroup: profile.ageGroup,
      learningSpeed: profile.learningSpeed,
      weakConcepts: weakConceptsOverride || analytics.weakTopics || [],
      pastMistakes: pastMistakesOverride || []
    });

    setPracticeSet(nextSet);
    setCurrentIndex(0);
    setAnswers([]);
    setLatestFeedback(null);
    setSessionComplete(false);
    setScoreCard({ accuracy: 0, speed: 0, confidence: 0, improvement: 0, weakTopics: [], strongTopics: [], learningScore: 0 });
    setReadiness('Needs Practice');

    if (user?.uid) {
      try {
        await savePracticeSession(user.uid, {
          sessionId: nextSet.id,
          topic: lessonTopic,
          difficulty: nextSet.difficulty,
          skillLevel: profile.skillLevel,
          learningSpeed: profile.learningSpeed,
          weakConcepts: nextSet.weakConcepts,
          questionCount: nextSet.questions.length,
          completed: false,
          source
        });

        await Promise.all(nextSet.questions.map((question) => saveQuestionBankEntry(user.uid, {
          lessonId: nextSet.id,
          topic: lessonTopic,
          questionType: question.type,
          difficulty: question.difficulty,
          prompt: question.prompt,
          answer: question.answer,
          concept: question.concept
        })));
      } catch (error) {
        console.error('Unable to initialize practice session:', error);
        setOffline(true);
      }
    }
  };

  useEffect(() => {
    if (loading) return;
    const lessonSnapshot = extractLessonSnapshot();
    if (!lessonSnapshot) return;
    setTopic(lessonSnapshot.topic);
    startSession({
      source: 'auto-lesson',
      topicOverride: lessonSnapshot.topic,
      weakConceptsOverride: lessonSnapshot.weakConcepts,
      pastMistakesOverride: lessonSnapshot.pastMistakes
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const currentQuestion = practiceSet.questions[currentIndex];
  const progressPercent = useMemo(() => {
    return Math.round(((currentIndex + 1) / Math.max(practiceSet.questions.length, 1)) * 100);
  }, [currentIndex, practiceSet.questions.length]);

  const handleSubmitAnswer = async (answer, meta = {}) => {
    if (!currentQuestion) return;

    const evaluation = evaluatePracticeAnswer(currentQuestion, {
      answer,
      confidence: meta.confidence,
      responseTimeSec: meta.responseTimeSec
    });

    const nextAnswer = {
      questionId: currentQuestion.id,
      type: currentQuestion.type,
      concept: currentQuestion.concept,
      learnerAnswer: answer,
      ...evaluation
    };

    const nextAnswers = [...answers, nextAnswer];
    setAnswers(nextAnswers);
    setLatestFeedback(evaluation.smartFeedback || null);

    const nextScoreCard = buildSessionScoreCard(practiceSet.questions, nextAnswers, history);
    setScoreCard(nextScoreCard);
    setReadiness(getCertificateReadiness(nextScoreCard));

    if (user?.uid) {
      try {
        await saveAssessmentHistory(user.uid, {
          sessionId: practiceSet.id,
          topic,
          questionId: currentQuestion.id,
          questionType: currentQuestion.type,
          learnerAnswer: answer,
          correct: evaluation.correct,
          weightedPoints: evaluation.weightedPoints,
          smartFeedback: evaluation.smartFeedback,
          responseTimeSec: evaluation.responseTimeSec,
          confidence: evaluation.confidence
        });
      } catch (error) {
        console.error('Unable to save assessment history:', error);
        setOffline(true);
      }
    }

    if (currentIndex < practiceSet.questions.length - 1) {
      setCurrentIndex((value) => value + 1);
      return;
    }

    setSessionComplete(true);
  };

  const finishSession = async () => {
    const finalScore = buildSessionScoreCard(practiceSet.questions, answers, history);
    const readinessState = getCertificateReadiness(finalScore);
    const nextDifficulty = buildAdaptiveDifficulty(finalScore, history);
    const record = {
      id: `local-${Date.now()}`,
      sessionId: practiceSet.id,
      topic,
      difficulty: nextDifficulty,
      readiness: readinessState,
      ...finalScore,
      accuracy: finalScore.accuracy,
      feedback: readinessState === 'Ready'
        ? 'Certificate-ready performance achieved.'
        : readinessState === 'Almost Ready'
          ? 'Close to readiness. Focus on weak topics.'
          : 'Needs focused revision and replay-based practice.'
    };

    setScoreCard(finalScore);
    setReadiness(readinessState);
    setLastSavedDifficulty(nextDifficulty);

    const nextHistory = [record, ...history];
    setHistory(nextHistory);
    setAnalytics(buildAnalytics(nextHistory));

    if (user?.uid) {
      try {
        await Promise.all([
          savePracticeSession(user.uid, {
            sessionId: practiceSet.id,
            topic,
            difficulty: nextDifficulty,
            skillLevel: profile.skillLevel,
            learningSpeed: profile.learningSpeed,
            weakConcepts: finalScore.weakTopics,
            questionCount: practiceSet.questions.length,
            completed: true
          }),
          savePracticeResult(user.uid, {
            sessionId: practiceSet.id,
            topic,
            difficulty: nextDifficulty,
            readiness: readinessState,
            ...finalScore
          }),
          saveLearningScore(user.uid, {
            sessionId: practiceSet.id,
            topic,
            readiness: readinessState,
            ...finalScore
          })
        ]);

        if (user?.uid) {
          await persistLearningSession({
            user,
            sourceLabel: topic || 'practice-session',
            sourceContext: 'practice',
            sessionData: {
              title: topic || 'Practice Session',
              topic: topic || 'Practice Session',
              summary: `Practice completed with ${finalScore.accuracy}% accuracy.`,
              difficulty: nextDifficulty,
              learningSession: { practice: { questions: practiceSet.questions } },
              lessonSuite: { practiceQuestions: practiceSet.questions },
              progress: { progressPercent: finalScore.accuracy, recommendedNext: 'Review weak topics', status: 'practice_completed' },
              assessment: { questionCount: practiceSet.questions.length, score: finalScore.accuracy, percentage: finalScore.accuracy }
            },
            assessmentContext: { questionCount: practiceSet.questions.length },
            planContext: { topic: topic || 'Practice Session', focus: 'practice', strengths: finalScore.strongTopics || ['practice'], weaknesses: finalScore.weakTopics || ['review'], learningStyle: profile.learningSpeed || 'guided', goal: 'mastery' }
          });
        }
      } catch (error) {
        console.error('Unable to save practice session:', error);
        setOffline(true);
      }
    }
  };

  if (loading) return <LoadingPractice />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Intelligent AI Practice & Assessment Engine</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Automatic personalized practice after every lesson</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Daksha AI generates 15 practice types automatically using lesson context, skill level, age, weak concepts, past mistakes, and learning speed.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Adaptive engine active</div>
            </div>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Data sync may be delayed.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <PracticeHome
                topic={topic}
                difficulty={difficulty}
                profile={profile}
                onTopicChange={setTopic}
                onDifficultyChange={setDifficulty}
                onProfileChange={setProfile}
                onStart={() => startSession({ source: 'manual' })}
              />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <PracticeSession question={currentQuestion} onSubmit={handleSubmitAnswer} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                <ProgressTracker progress={progressPercent} scoreCard={scoreCard} questionCount={practiceSet.questions.length} />
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                <WeakConcepts analytics={analytics} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><ShieldCheck className="h-4 w-4" /> Certificate Readiness</div>
              <p className="mt-3 text-2xl font-semibold text-white">{readiness}</p>
              <p className="mt-2 text-sm text-slate-400">Learning Score: {scoreCard.learningScore}/100 • Next difficulty recommendation: {lastSavedDifficulty}</p>
            </div>

            {latestFeedback ? (
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-cyan-300"><TrendingUp className="h-4 w-4" /> Smart Feedback</div>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p><span className="text-cyan-200">Why wrong:</span> {latestFeedback.whyWrong}</p>
                  <p><span className="text-cyan-200">Correct answer:</span> {latestFeedback.correctAnswer}</p>
                  <p><span className="text-cyan-200">Replay section:</span> {latestFeedback.replayLessonSection}</p>
                  <p><span className="text-cyan-200">Highlight concepts:</span> {(latestFeedback.highlightImportantConcepts || []).join(', ')}</p>
                  <p><span className="text-cyan-200">Recommended practice:</span> {latestFeedback.recommendedPractice}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <AIHints practiceSet={practiceSet} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <PracticeHistory history={history} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><Trophy className="h-4 w-4" /> Score Dimensions</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Accuracy: {scoreCard.accuracy}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Speed: {scoreCard.speed}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Confidence: {scoreCard.confidence}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Improvement: {scoreCard.improvement}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Weak Topics: {(scoreCard.weakTopics || []).join(', ') || 'None'}</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Strong Topics: {(scoreCard.strongTopics || []).join(', ') || 'Not yet'}</div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><BrainCircuit className="h-4 w-4" /> Practice Completion</div>
              <p className="mt-2 text-sm text-slate-400">Complete all 15 practice types, then save assessment and learning score.</p>
              <button onClick={finishSession} disabled={!sessionComplete} className="mt-4 rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">Save Assessment</button>
              {!sessionComplete ? <p className="mt-2 text-xs text-slate-500">Answer all questions to unlock save.</p> : null}
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><Target className="h-4 w-4" /> Analytics</div>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Accuracy: {analytics.accuracy}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Speed: {analytics.speed}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Confidence: {analytics.confidence}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Learning Score: {analytics.learningScore}/100</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
