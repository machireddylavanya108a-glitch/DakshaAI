import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, BrainCircuit, Sparkles } from 'lucide-react';
import ConversationHistory from '../components/aiTeacher/ConversationHistory';
import LessonController from '../components/aiTeacher/LessonController';
import LessonNavigator from '../components/aiTeacher/LessonNavigator';
import LessonPlayer from '../components/aiTeacher/LessonPlayer';
import LessonProgress from '../components/aiTeacher/LessonProgress';
import LessonTimeline from '../components/aiTeacher/LessonTimeline';
import QuestionPanel from '../components/aiTeacher/QuestionPanel';
import TeachingMode from '../components/aiTeacher/TeachingMode';
import VoiceController from '../components/aiTeacher/VoiceController';
import InteractiveLessonPauseSystem from '../components/common/InteractiveLessonPauseSystem';
import { useAuth } from '../context/AuthContext';
import {
  getLatestLessonSession,
  saveConversationHistory,
  saveLessonBookmark,
  saveLessonHistory,
  saveLessonProgress,
  saveLessonSession,
  saveVoicePreference
} from '../services/firestoreService';

const LOCAL_KEY = 'daksha:ai-teacher:session';
const OFFLINE_HISTORY_KEY = 'daksha:ai-teacher:offline-history';

const modeLead = {
  simple: 'I will keep this very simple, short, and practical.',
  professional: 'I will explain with professional clarity and structure.',
  children: 'I will teach like a friendly school teacher with fun examples.',
  college: 'I will teach with college-level depth and clear concepts.',
  expert: 'I will use advanced precision and expert-level terminology.'
};

function buildLessonChapters(topic, profile) {
  const baseTopic = String(topic || 'Learning Topic').trim() || 'Learning Topic';
  const languageLabel = profile.mixedLanguage
    ? `${profile.primaryLanguage} + ${profile.secondaryLanguage}`
    : profile.primaryLanguage;

  return [
    {
      title: `Lesson Kickoff: ${baseTopic}`,
      estimatedMinutes: 8,
      steps: [
        {
          label: 'Welcome',
          content: `Hello!\n\nToday we are going to learn ${baseTopic}.\nBefore we begin, here is what you will learn today.\n\nLanguage mode: ${languageLabel}. ${modeLead[profile.mode]}`
        },
        {
          label: 'Explain One Idea',
          content: `Core idea: ${baseTopic} solves real learning problems by turning concepts into actions.`
        },
        {
          label: 'Show Visual',
          content: `Visual board: Imagine a flow with 4 blocks -> Understand -> Practice -> Feedback -> Improve.`
        },
        {
          label: 'Give Example',
          content: `Example: A learner studies ${baseTopic} for 25 minutes daily, applies one task, and reviews mistakes.`
        },
        {
          label: 'Ask Learner',
          content: 'Quick check: Can you explain this idea in your own words before we move to the next chapter?'
        }
      ]
    },
    {
      title: `${baseTopic} Foundations`,
      estimatedMinutes: 12,
      steps: [
        {
          label: 'Explain One Idea',
          content: `Foundation concept: break ${baseTopic} into small pieces and learn one concept at a time.`
        },
        {
          label: 'Show Visual',
          content: `Visual board: Prerequisite chain -> Basics -> Core -> Practice -> Application.`
        },
        {
          label: 'Give Example',
          content: `Example: Build a mini-practice set for ${baseTopic} with easy, medium, and hard levels.`
        },
        {
          label: 'Ask Learner',
          content: 'Which part feels most difficult so far? I will simplify that part next.'
        }
      ]
    },
    {
      title: `${baseTopic} Real-world Application`,
      estimatedMinutes: 15,
      steps: [
        {
          label: 'Explain One Idea',
          content: `Application concept: use ${baseTopic} to solve practical tasks, not just theoretical questions.`
        },
        {
          label: 'Show Visual',
          content: 'Visual board: scenario input -> analysis -> action -> result -> reflection.'
        },
        {
          label: 'Give Example',
          content: `Example: Design a real case around ${baseTopic}, then compare two solution strategies.`
        },
        {
          label: 'Ask Learner',
          content: 'Would you like another example, a quiz question, or a comparison table?'
        }
      ]
    },
    {
      title: `${baseTopic} Mastery and Review`,
      estimatedMinutes: 10,
      steps: [
        {
          label: 'Explain One Idea',
          content: 'Mastery concept: revision + spacing + self-testing creates long-term retention.'
        },
        {
          label: 'Show Visual',
          content: 'Visual board: 1-day review, 3-day review, 7-day review, 14-day review.'
        },
        {
          label: 'Give Example',
          content: `Example: Summarize ${baseTopic} in five lines, then teach it to an imaginary student.`
        },
        {
          label: 'Ask Learner',
          content: 'Final check: should I summarize, repeat, simplify, compare, or give a quiz now?'
        }
      ]
    }
  ];
}

function getRate(speed) {
  if (speed === 'slow') return 0.8;
  if (speed === 'fast') return 1.2;
  return 1;
}

function withMixedLanguage(text, mode) {
  if (!mode.mixedLanguage) return text;
  return `${text}\n\n(${mode.secondaryLanguage} support active for key terms and quick translation.)`;
}

function answerQuestion(question, topic, chapterTitle, mode) {
  const q = String(question || '').toLowerCase();

  if (q.includes('translate')) {
    return `Translation mode active. I will explain this in ${mode.primaryLanguage} and ${mode.secondaryLanguage} together with simple phrasing.`;
  }
  if (q.includes("didn't understand") || q.includes('explain again')) {
    return `No problem. Let me simplify it again: ${topic} in this chapter means ${chapterTitle.toLowerCase()} through one small step at a time.`;
  }
  if (q.includes('another example')) {
    return `Another example: use ${topic} in a short 10-minute task, then compare your result with a model answer.`;
  }
  if (q.includes('why')) {
    return `Why this matters: ${topic} builds decision clarity and improves how you solve real problems.`;
  }
  if (q.includes('how')) {
    return `How to do it: understand one concept, practice immediately, ask one question, and revise quickly.`;
  }
  if (q.includes('show me')) {
    return 'Showing visual explanation now: concept block, connection arrows, and practical workflow.';
  }

  return `Great question. In this part, ${topic} is connected to ${chapterTitle.toLowerCase()} through applied practice and feedback.`;
}

function extractLanguageFromQuestion(question = '', fallbackMode) {
  const normalized = String(question || '').toLowerCase();
  if (normalized.includes('telugu')) return 'Telugu';
  if (normalized.includes('hindi')) return 'Hindi';
  if (normalized.includes('translate')) return fallbackMode.secondaryLanguage || fallbackMode.primaryLanguage;
  return fallbackMode.primaryLanguage || 'English';
}

function transformAnswerByRequest(answer = '', question = '') {
  const normalized = String(question || '').toLowerCase();
  if (normalized.includes('explain easier')) {
    return `Simple version: ${answer}`;
  }
  if (normalized.includes('explain deeper')) {
    return `${answer}\n\nDeep view: this concept also links to practical reasoning, trade-offs, and applied decision-making.`;
  }
  if (normalized.includes('summarize')) {
    return `Summary: ${answer.split('.').slice(0, 2).join('.').trim()}.`;
  }
  return answer;
}

export default function AITeacher() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('JavaScript Basics');
  const [teachingMode, setTeachingMode] = useState({
    mode: 'simple',
    primaryLanguage: 'English',
    secondaryLanguage: 'Hindi',
    mixedLanguage: true
  });
  const [voicePreferences, setVoicePreferences] = useState({
    voiceType: 'natural',
    speed: 'normal',
    captions: true,
    subtitles: true
  });
  const [chapters, setChapters] = useState(() => buildLessonChapters('JavaScript Basics', {
    mode: 'simple',
    primaryLanguage: 'English',
    secondaryLanguage: 'Hindi',
    mixedLanguage: true
  }));
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [interrupting, setInterrupting] = useState(false);
  const [weakTopics, setWeakTopics] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(() => `lesson_${Date.now()}`);
  const [replayNonce, setReplayNonce] = useState(0);
  const [whiteboardActions, setWhiteboardActions] = useState([]);

  const streamRef = useRef(null);
  const autoAdvanceRef = useRef(null);

  const currentChapter = chapters[currentChapterIndex] || chapters[0];
  const currentStep = currentChapter?.steps?.[currentStepIndex] || null;

  const totalSteps = useMemo(() => chapters.reduce((sum, chapter) => sum + (chapter.steps?.length || 0), 0), [chapters]);
  const completedSteps = useMemo(() => {
    let completed = 0;
    for (let i = 0; i < chapters.length; i += 1) {
      if (i < currentChapterIndex) {
        completed += chapters[i].steps.length;
      }
      if (i === currentChapterIndex) {
        completed += currentStepIndex;
      }
    }
    return completed;
  }, [chapters, currentChapterIndex, currentStepIndex]);
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const estimatedMinutesLeft = useMemo(() => {
    const remainingChapters = chapters.slice(currentChapterIndex);
    const chapterMinutes = remainingChapters.reduce((sum, chapter) => sum + (chapter.estimatedMinutes || 0), 0);
    return Math.max(1, chapterMinutes - Math.floor(currentStepIndex * 1.5));
  }, [chapters, currentChapterIndex, currentStepIndex]);

  useEffect(() => {
    const cached = localStorage.getItem(`${LOCAL_KEY}:${user?.uid || 'guest'}`);
    const loadRemote = async () => {
      if (!user?.uid) return null;
      return getLatestLessonSession(user.uid);
    };

    const hydrate = async () => {
      let data = null;
      if (cached) {
        try {
          data = JSON.parse(cached);
        } catch (error) {
          console.error('Invalid local AI Teacher cache:', error);
        }
      }

      const remote = await loadRemote();
      const payload = remote || data;

      if (payload) {
        const nextMode = payload.teachingMode || teachingMode;
        const nextTopic = payload.topic || topic;
        const nextChapters = buildLessonChapters(nextTopic, nextMode);
        setTopic(nextTopic);
        setTeachingMode(nextMode);
        setVoicePreferences(payload.voicePreferences || voicePreferences);
        setChapters(nextChapters);
        setCurrentChapterIndex(Number.isFinite(payload.chapterIndex) ? payload.chapterIndex : 0);
        setCurrentStepIndex(Number.isFinite(payload.stepIndex) ? payload.stepIndex : 0);
        setWeakTopics(Array.isArray(payload.weakTopics) ? payload.weakTopics : []);
        setBookmarks(Array.isArray(payload.bookmarks) ? payload.bookmarks : []);
        setSessionId(payload.sessionId || `lesson_${Date.now()}`);
        setMessages(Array.isArray(payload.messages) ? payload.messages : []);
        setIsPlaying(!payload.paused);
      } else {
        const first = chapters?.[0]?.steps?.[0]?.content || 'Hello! Let us begin.';
        setMessages([{ role: 'assistant', content: withMixedLanguage(first, teachingMode) }]);
      }
    };

    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!currentStep) return undefined;
    clearInterval(streamRef.current);
    clearTimeout(autoAdvanceRef.current);

    const fullText = withMixedLanguage(currentStep.content, teachingMode);

    if (!isPlaying || interrupting) {
      setDisplayedText(fullText);
      setSubtitleText(voicePreferences.subtitles ? fullText : '');
      return undefined;
    }

    setDisplayedText('');
    let index = 0;
    const chunk = voicePreferences.speed === 'slow' ? 1 : voicePreferences.speed === 'fast' ? 4 : 2;
    const delay = voicePreferences.speed === 'slow' ? 48 : voicePreferences.speed === 'fast' ? 18 : 28;

    streamRef.current = setInterval(() => {
      index += chunk;
      const nextText = fullText.slice(0, index);
      setDisplayedText(nextText);
      setSubtitleText(voicePreferences.subtitles ? nextText : '');

      if (index >= fullText.length) {
        clearInterval(streamRef.current);
        autoAdvanceRef.current = setTimeout(() => {
          if (!interrupting && isPlaying) {
            goNext();
          }
        }, 1500);
      }
    }, delay);

    return () => {
      clearInterval(streamRef.current);
      clearTimeout(autoAdvanceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapterIndex, currentStepIndex, isPlaying, interrupting, replayNonce, teachingMode, voicePreferences.speed, voicePreferences.subtitles]);

  useEffect(() => {
    if (!currentStep) return;
    const text = withMixedLanguage(currentStep.content, teachingMode);

    if (!window.speechSynthesis || !isPlaying || interrupting) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = getRate(voicePreferences.speed);
    utterance.lang = teachingMode.primaryLanguage === 'English' ? 'en-US' : 'en-US';
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentStep, teachingMode, voicePreferences.speed, isPlaying, interrupting]);

  useEffect(() => {
    const handleKeys = (event) => {
      const target = event.target;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.code === 'Space') {
        event.preventDefault();
        setIsPlaying((value) => !value);
      }
      if (event.code === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      }
      if (event.code === 'KeyR') {
        event.preventDefault();
        setReplayNonce((value) => value + 1);
      }
      if (event.code === 'Slash') {
        event.preventDefault();
        const questionInput = document.getElementById('lesson-question-input');
        questionInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  });

  useEffect(() => {
    const saveLocal = () => {
      const payload = {
        sessionId,
        topic,
        teachingMode,
        voicePreferences,
        chapterIndex: currentChapterIndex,
        stepIndex: currentStepIndex,
        weakTopics,
        bookmarks,
        paused: !isPlaying,
        messages
      };

      localStorage.setItem(`${LOCAL_KEY}:${user?.uid || 'guest'}`, JSON.stringify(payload));
    };

    saveLocal();
  }, [sessionId, topic, teachingMode, voicePreferences, currentChapterIndex, currentStepIndex, weakTopics, bookmarks, isPlaying, messages, user?.uid]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!user?.uid) return;

      await Promise.all([
        saveLessonSession(user.uid, {
          sessionId,
          topic,
          teachingMode,
          chapterIndex: currentChapterIndex,
          stepIndex: currentStepIndex,
          weakTopics,
          bookmarks,
          paused: !isPlaying,
          progressPercent,
          voicePreferences
        }),
        saveLessonProgress(user.uid, {
          topic,
          chapterIndex: currentChapterIndex,
          stepIndex: currentStepIndex,
          weakTopics,
          progressPercent
        }),
        saveConversationHistory(user.uid, sessionId, messages),
        saveVoicePreference(user.uid, voicePreferences)
      ]);
    }, 800);

    return () => clearTimeout(timer);
  }, [user?.uid, sessionId, topic, teachingMode, currentChapterIndex, currentStepIndex, weakTopics, bookmarks, isPlaying, progressPercent, messages, voicePreferences]);

  const goNext = () => {
    if (!currentChapter) return;

    if (currentStepIndex < currentChapter.steps.length - 1) {
      setCurrentStepIndex((value) => value + 1);
      return;
    }

    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex((value) => value + 1);
      setCurrentStepIndex(0);
      return;
    }

    setIsPlaying(false);
    setMessages((prev) => [...prev, { role: 'assistant', content: `Excellent work. You completed the lesson on ${topic}.` }]);

    const offlineHistory = JSON.parse(localStorage.getItem(OFFLINE_HISTORY_KEY) || '[]');
    localStorage.setItem(OFFLINE_HISTORY_KEY, JSON.stringify([
      {
        topic,
        progressPercent: 100,
        completedAt: Date.now()
      },
      ...offlineHistory
    ].slice(0, 20)));

    if (user?.uid) {
      saveLessonHistory(user.uid, {
        topic,
        summary: `Completed interactive lesson for ${topic}`,
        progressPercent: 100,
        weakTopics
      });
    }
  };

  const goPrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((value) => value - 1);
      return;
    }

    if (currentChapterIndex > 0) {
      const previousChapterIndex = currentChapterIndex - 1;
      const previousChapter = chapters[previousChapterIndex];
      setCurrentChapterIndex(previousChapterIndex);
      setCurrentStepIndex(Math.max(0, previousChapter.steps.length - 1));
    }
  };

  const startLesson = () => {
    const cachedLesson = localStorage.getItem(`daksha:lesson-cache:${topic}`);
    let nextChapters;

    if (cachedLesson) {
      try {
        nextChapters = JSON.parse(cachedLesson);
      } catch {
        nextChapters = buildLessonChapters(topic, teachingMode);
      }
    } else {
      nextChapters = buildLessonChapters(topic, teachingMode);
      localStorage.setItem(`daksha:lesson-cache:${topic}`, JSON.stringify(nextChapters));
    }

    setChapters(nextChapters);
    setCurrentChapterIndex(0);
    setCurrentStepIndex(0);
    setMessages([{ role: 'assistant', content: withMixedLanguage(nextChapters[0].steps[0].content, teachingMode) }]);
    setSessionId(`lesson_${Date.now()}`);
    setIsPlaying(true);
  };

  const askQuestion = (question) => {
    const answer = answerQuestion(question, topic, currentChapter?.title || 'Current chapter', teachingMode);

    setInterrupting(true);
    setIsPlaying(false);
    setMessages((prev) => [
      ...prev,
      { role: 'learner', content: question },
      { role: 'assistant', content: withMixedLanguage(answer, teachingMode) }
    ]);

    if (/(didn't understand|explain again|confusing|hard)/i.test(question)) {
      setWeakTopics((prev) => {
        const set = new Set(prev);
        set.add(currentChapter?.title || 'Current chapter');
        return Array.from(set);
      });
    }

    setTimeout(() => {
      setInterrupting(false);
      setIsPlaying(true);
      setReplayNonce((value) => value + 1);
    }, 900);
  };

  const toggleBookmark = async (chapterIndex) => {
    setBookmarks((prev) => {
      const has = prev.includes(chapterIndex);
      if (has) return prev.filter((item) => item !== chapterIndex);
      return [...prev, chapterIndex];
    });

    if (user?.uid) {
      await saveLessonBookmark(user.uid, {
        topic,
        chapterIndex,
        note: `Bookmark in ${topic} chapter ${chapterIndex + 1}`
      });
    }
  };

  const handleWhiteboardAction = (action) => {
    setWhiteboardActions((prev) => [
      {
        action,
        chapter: currentChapter?.title || '',
        at: Date.now()
      },
      ...prev
    ].slice(0, 20));
  };

  const handleVoiceCommand = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      askQuestion('Voice commands are unavailable in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || '').toLowerCase();
      if (transcript.includes('pause')) setIsPlaying(false);
      else if (transcript.includes('resume') || transcript.includes('play')) setIsPlaying(true);
      else if (transcript.includes('next')) goNext();
      else if (transcript.includes('previous')) goPrevious();
      else if (transcript.includes('repeat')) setReplayNonce((value) => value + 1);
      else askQuestion(transcript || 'Can you explain this part?');
    };

    recognition.start();
  };

  const capturePauseState = () => ({
    sessionId,
    currentLesson: topic,
    currentChapter: currentChapterTitle,
    currentTopic: topic,
    currentSlide: currentStepIndex,
    currentStepIndex,
    currentChapterIndex,
    animationTimestamp: Date.now(),
    cameraPosition: null,
    narrationSentence: displayedText || currentStep?.content || '',
    quizProgress: progressPercent,
    teachingMode,
    voicePreferences,
    messages,
    weakTopics,
    bookmarks,
    replayNonce,
    whiteboardActions
  });

  const restorePauseState = (state) => {
    if (!state) return;
    if (Number.isFinite(state.currentChapterIndex)) setCurrentChapterIndex(state.currentChapterIndex);
    if (Number.isFinite(state.currentStepIndex)) setCurrentStepIndex(state.currentStepIndex);
    if (state.currentLesson) setTopic(state.currentLesson);
    if (Array.isArray(state.messages)) setMessages(state.messages);
    if (Array.isArray(state.weakTopics)) setWeakTopics(state.weakTopics);
    if (Array.isArray(state.bookmarks)) setBookmarks(state.bookmarks);
    if (Array.isArray(state.whiteboardActions)) setWhiteboardActions(state.whiteboardActions);
    setInterrupting(false);
    setIsPlaying(true);
  };

  const handleLessonPauseAsk = (question) => {
    const language = extractLanguageFromQuestion(question, teachingMode);
    const raw = answerQuestion(question, topic, currentChapter?.title || 'Current chapter', {
      ...teachingMode,
      primaryLanguage: language
    });
    const answer = transformAnswerByRequest(raw, question);

    setInterrupting(true);
    setIsPlaying(false);
    setMessages((prev) => [
      ...prev,
      { role: 'learner', content: question },
      { role: 'assistant', content: withMixedLanguage(answer, { ...teachingMode, primaryLanguage: language }) }
    ]);

    if (/(didn't understand|explain again|confusing|hard|easier|why)/i.test(question)) {
      setWeakTopics((prev) => {
        const set = new Set(prev);
        set.add(currentChapter?.title || 'Current chapter');
        return Array.from(set);
      });
    }
  };

  const currentChapterTitle = currentChapter?.title || 'Lesson Chapter';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">AI Teacher & Interactive Lesson Player</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Human-like teacher experience for every lesson</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-400 sm:text-base">Teach naturally, visualize concepts, answer interruptions in real-time, and resume exactly from the same lesson position with memory and voice support.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Real Teacher Mode</div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row">
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Enter lesson topic..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white"
              aria-label="Lesson topic"
            />
            <button type="button" onClick={startLesson} className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950">
              Start AI Teacher Lesson
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <InteractiveLessonPauseSystem
              lessonType="ai-teacher"
              userId={user?.uid}
              topic={topic}
              captureState={capturePauseState}
              onPlay={() => {
                setInterrupting(false);
                setIsPlaying(true);
                setReplayNonce((value) => value + 1);
              }}
              onPause={() => {
                setInterrupting(true);
                setIsPlaying(false);
              }}
              onNext={goNext}
              onPrevious={goPrevious}
              onRepeat={() => setReplayNonce((value) => value + 1)}
              onSkip={goNext}
              onRestoreState={restorePauseState}
            />

            <LessonPlayer
              topic={topic}
              chapter={currentChapter}
              step={currentStep}
              displayedText={displayedText}
              captionsEnabled={voicePreferences.captions}
              subtitleText={subtitleText}
              onWhiteboardAction={handleWhiteboardAction}
            />

            <LessonController
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying((value) => !value)}
              onPrevious={goPrevious}
              onNext={goNext}
              onRepeat={() => setReplayNonce((value) => value + 1)}
              onSlow={() => setVoicePreferences((prev) => ({ ...prev, speed: 'slow' }))}
              onNormal={() => setVoicePreferences((prev) => ({ ...prev, speed: 'normal' }))}
              onFast={() => setVoicePreferences((prev) => ({ ...prev, speed: 'fast' }))}
            />

            <QuestionPanel onAsk={handleLessonPauseAsk} />
            <ConversationHistory messages={messages} />

            <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30">
              <div className="flex items-center gap-2 text-cyan-300"><BrainCircuit className="h-4 w-4" /> Whiteboard Actions</div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {whiteboardActions.length === 0 ? <p className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-slate-400">No whiteboard action yet.</p> : whiteboardActions.map((item, index) => (
                  <p key={`${item.action}-${item.at}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">{item.action} on {item.chapter}</p>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <TeachingMode value={teachingMode} onChange={setTeachingMode} />
            <VoiceController value={voicePreferences} onChange={setVoicePreferences} onVoiceCommand={handleVoiceCommand} />
            <LessonTimeline chapters={chapters} currentChapterIndex={currentChapterIndex} estimatedMinutesLeft={estimatedMinutesLeft} />
            <LessonProgress
              progressPercent={progressPercent}
              currentChapter={currentChapterTitle}
              completed={currentChapterIndex}
              remaining={Math.max(0, chapters.length - currentChapterIndex - 1)}
            />
            <LessonNavigator
              chapters={chapters}
              currentChapterIndex={currentChapterIndex}
              bookmarks={bookmarks}
              onGoToChapter={(index) => {
                setCurrentChapterIndex(index);
                setCurrentStepIndex(0);
              }}
              onToggleBookmark={toggleBookmark}
            />

            <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30">
              <div className="flex items-center gap-2 text-cyan-300"><BookOpen className="h-4 w-4" /> Memory Snapshot</div>
              <div className="mt-3 text-sm text-slate-300">
                <p>Current lesson: {topic}</p>
                <p>Current chapter: {currentChapterTitle}</p>
                <p>Resume step: {currentStepIndex + 1}</p>
                <p>Weak topics: {weakTopics.length ? weakTopics.join(', ') : 'None yet'}</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
