import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  deleteUserMemoryProfile,
  getMemoryBrain,
  getUserCameraLearning,
  getUserDocxLearning,
  getUserExerciseProgress,
  getUserFlashcards,
  getUserInterviewHistory,
  getUserLessonSuites,
  getUserMemoryProfile,
  getUserPdfLearning,
  getUserPptLearning,
  getUserPracticeResults,
  getUserQuizRecords,
  getUserQuizScores,
  getUserSceneHistory,
  getUserSkillRoadmaps,
  getUserVoiceLessons,
  getUserWebsiteLearning,
  getUserYouTubeLearning,
  saveAchievementsSnapshot,
  saveLearningProfileSnapshot,
  saveMemoryBrain,
  saveProgressSnapshot,
  saveRecommendationsSnapshot,
  saveRevisionScheduleSnapshot,
  saveSkillTreeSnapshot,
  saveStudyHistory,
  saveUserMemoryProfile
} from '../services/firestoreService';
import LearningProfile from '../components/memory/LearningProfile';
import MemoryTimeline from '../components/memory/MemoryTimeline';
import Recommendations from '../components/memory/Recommendations';
import WeakConcepts from '../components/memory/WeakConcepts';
import Achievements from '../components/memory/Achievements';
import LoadingMemory from '../components/memory/LoadingMemory';
import { buildMemoryBrain } from '../utils/memoryUtils';

const EMPTY_PROFILE = buildMemoryBrain({
  learningHistory: [],
  weakConcepts: [],
  strongConcepts: [],
  learningGoals: 'Revise weekly and practice one project every week.',
  memoryNotes: 'Build a personal learning brain with every new lesson and quiz result.'
});

function normalizeDateMs(value) {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function getUniqueSubjectCount(history) {
  const subjects = new Set(history.map((item) => item.subject || item.title || '').filter(Boolean));
  return subjects.size;
}

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
      const [
        saved,
        savedBrain,
        pdfs,
        docxs,
        ppts,
        cameras,
        yts,
        websites,
        flashcards,
        quizzes,
        voiceLessons,
        quizScores,
        interviews,
        exercises,
        practiceResults,
        sceneHistory,
        skillRoadmaps,
        lessonSuites
      ] = await Promise.all([
        getUserMemoryProfile(user.uid),
        getMemoryBrain(user.uid),
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
        getUserExerciseProgress(user.uid),
        getUserPracticeResults(user.uid),
        getUserSceneHistory(user.uid),
        getUserSkillRoadmaps(user.uid),
        getUserLessonSuites(user.uid)
      ]);

      const history = [];
      const addEntry = (type, title, summary, timestamp, subject = '') => history.push({
        type,
        title,
        summary,
        subject: subject || title,
        timestampMs: normalizeDateMs(timestamp),
        timestamp: new Date(normalizeDateMs(timestamp)).toLocaleString()
      });

      pdfs.forEach((item) => addEntry('PDF', item.fileName || 'PDF lesson', item.summary || item.lesson?.summary || 'Document studied', item.createdAt, item.topic || item.fileName));
      docxs.forEach((item) => addEntry('DOCX', item.fileName || 'DOCX lesson', item.previewText || 'Document studied', item.createdAt, item.topic || item.fileName));
      ppts.forEach((item) => addEntry('PPT', item.fileName || 'Presentation', item.summary || 'Presentation reviewed', item.createdAt, item.topic || item.fileName));
      cameras.forEach((item) => addEntry('Camera OCR', item.imageName || 'Image', item.summary || item.lesson?.summary || 'OCR content learned', item.createdAt, item.topic || item.imageName));
      yts.forEach((item) => addEntry('YouTube', item.videoTitle || 'YouTube lesson', item.summary || 'Video lesson reviewed', item.createdAt, item.topic || item.videoTitle));
      websites.forEach((item) => addEntry('Website', item.title || item.url || 'Website lesson', item.summary || 'Web content studied', item.createdAt, item.title || item.url));
      flashcards.forEach((item) => addEntry('Flashcards', item.topic || 'Flashcard deck', `${(item.deck?.flashcards || []).length} cards studied`, item.createdAt, item.topic));
      quizzes.forEach((item) => addEntry('Quiz', item.topic || 'Quiz session', `${item.percentage || 0}% score`, item.createdAt, item.topic));
      voiceLessons.forEach((item) => addEntry('Voice', item.topic || 'Voice lesson', `${item.language || 'English'} • ${item.teacherMode || 'friendly'}`, item.createdAt, item.topic));
      quizScores.forEach((item) => addEntry('Score', item.topic || 'Quiz score', `${item.score}/${item.total}`, item.createdAt, item.topic));
      interviews.forEach((item) => addEntry('Interview', item.topic || 'Interview prep', item.category || 'Practice', item.createdAt, item.topic));
      exercises.forEach((item) => addEntry('Practice', item.topic || 'Practice session', `${(item.exercises || []).length} exercises tracked`, item.updatedAt, item.topic));
      practiceResults.forEach((item) => addEntry('Practice', item.topic || 'Adaptive practice', `${item.accuracy || 0}% accuracy • ${item.learningScore || 0} learning score`, item.updatedAt, item.topic));
      sceneHistory.forEach((item) => addEntry('3D', item.topic || '3D session', item.type || 'Interactive 3D activity', item.updatedAt || item.createdAt, item.topic));
      skillRoadmaps.forEach((item) => addEntry('Skill', item.skill || 'Skill roadmap', 'Roadmap updated', item.createdAt, item.skill));
      lessonSuites.forEach((item) => addEntry('Lesson', item.topic || 'Lesson suite', 'Structured lesson suite available', item.createdAt, item.topic));

      history.sort((a, b) => b.timestampMs - a.timestampMs);

      const questionCount = quizzes.reduce((sum, item) => sum + (item.quiz?.questions?.length || item.questions?.length || 0), 0);
      const averageQuizScore = quizzes.length
        ? Math.round(quizzes.reduce((acc, item) => acc + (item.percentage || 0), 0) / quizzes.length)
        : 0;
      const averageConfidence = practiceResults.length
        ? Math.round(practiceResults.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / practiceResults.length)
        : 60;
      const totalStudyHours = Math.round((history.length * 0.45) + (quizzes.length * 0.2) + (practiceResults.length * 0.25));
      const languagesUsed = Array.from(new Set([
        ...voiceLessons.map((item) => item.language || 'English'),
        saved?.preferences?.language || 'English'
      ])).filter(Boolean);

      const nextProfile = buildMemoryBrain({
        ...(saved || {}),
        ...(savedBrain || {}),
        learningHistory: history,
        weakConcepts: saved?.weakConcepts || savedBrain?.weakConcepts || ['Revision needed'],
        strongConcepts: saved?.strongConcepts || savedBrain?.strongConcepts || [],
        learningGoals: saved?.learningGoals || savedBrain?.learningGoals || EMPTY_PROFILE.learningGoals,
        memoryNotes: saved?.memoryNotes || savedBrain?.memoryNotes || EMPTY_PROFILE.memoryNotes,
        preferences: {
          language: saved?.preferences?.language || savedBrain?.preferences?.language || 'English',
          teacherStyle: saved?.preferences?.teacherStyle || savedBrain?.preferences?.teacherStyle || 'friendly',
          difficulty: saved?.preferences?.difficulty || savedBrain?.preferences?.difficulty || 'adaptive'
        },
        studyHours: totalStudyHours,
        averageQuizScore,
        confidence: averageConfidence,
        questionCount,
        languages: languagesUsed,
        skills: skillRoadmaps.map((item) => item.skill || '').filter(Boolean),
        certificateCount: savedBrain?.memoryBrain?.trackEverything?.certificates || 0,
        trackEverything: {
          subjects: getUniqueSubjectCount(history),
          skills: skillRoadmaps.length,
          lessons: lessonSuites.length + pdfs.length + docxs.length + ppts.length,
          books: pdfs.filter((item) => /book/i.test(item.fileName || '')).length,
          pdfs: pdfs.length,
          videos: yts.length,
          questions: questionCount,
          quizzes: quizzes.length,
          practice: exercises.length + practiceResults.length,
          certificates: savedBrain?.memoryBrain?.trackEverything?.certificates || 0,
          sessions3d: sceneHistory.length,
          voiceSessions: voiceLessons.length,
          languages: languagesUsed.length,
          studyTime: totalStudyHours,
          attendance: new Set(history.map((item) => new Date(item.timestampMs).toDateString())).size
        }
      });

      setProfile(nextProfile);
      setMemoryNotes(nextProfile.memoryNotes || '');
      setLearningGoals(nextProfile.learningGoals || '');

      await Promise.all([
        saveUserMemoryProfile(user.uid, nextProfile),
        saveMemoryBrain(user.uid, nextProfile.memoryBrain),
        saveLearningProfileSnapshot(user.uid, nextProfile.memoryBrain.learningProfile),
        saveProgressSnapshot(user.uid, nextProfile.memoryBrain.progressDashboard),
        saveStudyHistory(user.uid, { entries: nextProfile.learningHistory.slice(0, 120) }),
        saveAchievementsSnapshot(user.uid, { badges: nextProfile.badges, achievements: nextProfile.achievements }),
        saveSkillTreeSnapshot(user.uid, { skills: nextProfile.memoryBrain.progressDashboard.skillTree }),
        saveRecommendationsSnapshot(user.uid, nextProfile.memoryBrain.aiRecommendations),
        saveRevisionScheduleSnapshot(user.uid, {
          schedule: nextProfile.revisionSchedule,
          reminders: nextProfile.memoryBrain.reminders
        })
      ]);

      setIsOffline(false);
    } catch (err) {
      console.error('Memory dashboard error:', err);
      setError('Unable to sync memory brain. Using fallback profile.');
      setIsOffline(true);
      const fallback = buildMemoryBrain({ ...EMPTY_PROFILE, learningHistory: [] });
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

  const trackEntries = useMemo(() => {
    const tracking = profile?.memoryBrain?.trackEverything || {};
    return [
      ['Subjects', tracking.subjects],
      ['Skills', tracking.skills],
      ['Lessons', tracking.lessons],
      ['Books', tracking.books],
      ['PDFs', tracking.pdfs],
      ['Videos', tracking.videos],
      ['Questions', tracking.questions],
      ['Quiz Scores', tracking.quizzes],
      ['Practice', tracking.practice],
      ['Certificates', tracking.certificates],
      ['3D Sessions', tracking.sessions3d],
      ['Voice Sessions', tracking.voiceSessions],
      ['Languages', tracking.languages],
      ['Study Time (h)', tracking.studyTime],
      ['Attendance', tracking.attendance],
      ['Daily Streak', tracking.dailyStreak],
      ['Weekly Streak', tracking.weeklyStreak],
      ['Monthly Streak', tracking.monthlyStreak]
    ];
  }, [profile]);

  const saveMemory = async () => {
    if (!user?.uid) return;
    try {
      const nextProfile = buildMemoryBrain({
        ...profile,
        learningGoals,
        memoryNotes,
        learningHistory: profile.learningHistory,
        weakConcepts: profile.weakConcepts,
        strongConcepts: profile.strongConcepts,
        preferences: profile.preferences
      });

      setProfile(nextProfile);
      await Promise.all([
        saveUserMemoryProfile(user.uid, nextProfile),
        saveMemoryBrain(user.uid, nextProfile.memoryBrain),
        saveLearningProfileSnapshot(user.uid, nextProfile.memoryBrain.learningProfile),
        saveProgressSnapshot(user.uid, nextProfile.memoryBrain.progressDashboard),
        saveAchievementsSnapshot(user.uid, { badges: nextProfile.badges, achievements: nextProfile.achievements }),
        saveSkillTreeSnapshot(user.uid, { skills: nextProfile.memoryBrain.progressDashboard.skillTree }),
        saveRecommendationsSnapshot(user.uid, nextProfile.memoryBrain.aiRecommendations),
        saveRevisionScheduleSnapshot(user.uid, {
          schedule: nextProfile.revisionSchedule,
          reminders: nextProfile.memoryBrain.reminders
        })
      ]);
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
    link.download = `${user?.uid || 'memory'}-brain.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      const nextProfile = buildMemoryBrain({ ...profile, ...imported, learningHistory: imported.learningHistory || profile.learningHistory });
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
      setMemoryNotes(EMPTY_PROFILE.memoryNotes || '');
      setLearningGoals(EMPTY_PROFILE.learningGoals || '');
    } catch (err) {
      setError('Could not reset memory profile.');
    }
  };

  const progress = profile?.memoryBrain?.progressDashboard || {};
  const smartMemory = profile?.memoryBrain?.smartMemory || {};
  const reminders = profile?.memoryBrain?.reminders || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Daksha AI Memory Brain</p>
              <h1 className="mt-2 text-4xl font-semibold text-white">Continuous learner memory with adaptive personalization</h1>
              <p className="mt-3 max-w-2xl text-slate-400">Daksha tracks learning behavior, remembers known concepts, predicts forgetting, and personalizes every future recommendation.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={saveMemory} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Save Memory Brain</button>
              <button onClick={handleExport} className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-200">Export</button>
              <label className="cursor-pointer rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-200">
                Import
                <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={handleReset} className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">Reset</button>
            </div>
          </div>
        </div>

        {error ? <div className="rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div> : null}
        {isOffline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Memory data will sync when connection restores.</div> : null}

        {loading ? <LoadingMemory /> : (
          <>
            <LearningProfile profile={profile} />

            <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Track Everything</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Unified learner activity memory</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {trackEntries.map(([label, value]) => (
                  <div key={label} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm">
                    <p className="text-slate-400">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{value || 0}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <MemoryTimeline history={profile.learningHistory || []} />
              <div className="space-y-6">
                <Recommendations items={profile?.memoryBrain?.aiRecommendations || profile.recommendations || []} />
                <WeakConcepts concepts={profile.weakConcepts || []} />
              </div>
            </div>

            <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Progress Dashboard</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Daily to yearly growth intelligence</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Daily Progress: {progress.dailyProgress || 0}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Weekly Progress: {progress.weeklyProgress || 0}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Monthly Progress: {progress.monthlyProgress || 0}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Yearly Progress: {progress.yearlyProgress || 0}%</div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-[1rem] border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                  <p className="text-xs uppercase tracking-[0.2em]">Knowledge Graph</p>
                  <p className="mt-2">{(progress.knowledgeGraph?.nodes || []).slice(0, 8).join(' -> ') || 'No concept graph yet.'}</p>
                </div>
                <div className="rounded-[1rem] border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <p className="text-xs uppercase tracking-[0.2em]">Skill Tree</p>
                  <p className="mt-2">{(progress.skillTree || []).slice(0, 6).map((item) => `${item.skill} (${item.level})`).join(', ') || 'No skills mapped yet.'}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Smart Memory</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Never repeat what learner already knows</h3>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                  <p className="text-slate-400">Known concepts</p>
                  <p className="mt-2 text-white">{(smartMemory.knownConcepts || []).join(', ') || 'Building known-concept memory...'}</p>
                  <p className="mt-2 text-xs text-slate-500">Never ask basic known concepts again: {smartMemory.avoidRepeatingKnownBasics ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                  <p className="text-slate-400">Weak concept auto-revision</p>
                  <p className="mt-2 text-white">{(smartMemory.autoReviseWeakConcepts || []).join(', ') || 'No weak concepts yet.'}</p>
                  <p className="mt-2 text-xs text-slate-500">Predict forgetting and schedule revision sessions automatically.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {(profile.revisionSchedule || []).slice(0, 6).map((item) => (
                  <div key={`${item.concept}-${item.nextRevisionAt}`} className="rounded-[1rem] border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                    {item.concept} • Risk {item.forgettingRisk}% • Revise in {item.reviseInDays} day(s)
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Reminders</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Daily smart reminder engine</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {reminders.map((item) => (
                  <div key={item.type} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">{item.type}</p>
                    <p className="mt-2">{item.message}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
                <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Memory Notes</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Personal long-term learning context</h3>
                <textarea value={memoryNotes} onChange={(event) => setMemoryNotes(event.target.value)} className="mt-4 min-h-[160px] w-full rounded-[1.25rem] border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200 outline-none" />
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
                <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Learning Goals</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Career-aligned study objectives</h3>
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
