import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Mic, Pencil, RotateCcw, SkipForward, User, X } from 'lucide-react';
import {
  buildLearningInterviewQuestions,
  toLearningInterviewPayload
} from '../../utils/learningInterviewUtils';
import {
  completeLearningInterview,
  getLatestLearningSession,
  saveLearningSessionProgress
} from '../../services/firestoreService';

function TypewriterText({ text }) {
  const [visible, setVisible] = useState('');

  useEffect(() => {
    let active = true;
    let index = 0;
    const value = String(text || '');
    const timer = setInterval(() => {
      if (!active) return;
      index += 2;
      setVisible(value.slice(0, index));
      if (index >= value.length) {
        clearInterval(timer);
      }
    }, 12);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [text]);

  return <span>{visible}</span>;
}

function makeSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function LearningInterviewModal({
  isOpen,
  userId,
  sourceContext = 'general',
  sourceLabel = '',
  initialTopic = '',
  onClose,
  onComplete
}) {
  const [answers, setAnswers] = useState({});
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [resumeDraft, setResumeDraft] = useState(null);
  const [checkingResume, setCheckingResume] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const questions = useMemo(() => buildLearningInterviewQuestions(answers.learnTopic || initialTopic), [answers.learnTopic, initialTopic]);
  const currentQuestion = questions[currentStep];
  const progress = Math.min(100, Math.round(((currentStep + 1) / questions.length) * 100));

  const pushAssistantQuestion = (step) => {
    const question = questions[step];
    if (!question) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `${sessionId || 'active'}-assistant-${step}-${Date.now()}`,
        role: 'assistant',
        text: question.prompt,
        animate: true
      }
    ]);
    setInput((answers[question.id] || '').toString());
  };

  useEffect(() => {
    if (!isOpen) return;

    const newSessionId = makeSessionId();
    setSessionId(newSessionId);
    setAnswers({});
    setCurrentStep(0);
    setMessages([
      {
        id: `${newSessionId}-intro`,
        role: 'assistant',
        text: 'Before building your roadmap, I will run a quick AI Learning Interview to personalize your plan. You can answer by text or voice, go back, skip, edit, and resume later.',
        animate: true
      }
    ]);

    const localDraftRaw = window.localStorage.getItem(`daksha:interview:${sourceContext}`);
    if (localDraftRaw) {
      try {
        const localDraft = JSON.parse(localDraftRaw);
        if (localDraft?.answers) {
          setResumeDraft(localDraft);
        }
      } catch (error) {
        console.error('Unable to parse local interview draft:', error);
      }
    }

    if (userId) {
      setCheckingResume(true);
      getLatestLearningSession(userId, sourceContext)
        .then((draft) => {
          if (draft?.status && draft.status !== 'completed') {
            setResumeDraft(draft);
          }
        })
        .finally(() => setCheckingResume(false));
    }
  }, [isOpen, sourceContext, userId]);

  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || resumeDraft) return;
    if (messages.length === 1) {
      pushAssistantQuestion(0);
    }
  }, [isOpen, messages.length, resumeDraft]);

  if (!isOpen) {
    return null;
  }

  const persistProgress = async (nextAnswers, step) => {
    const payload = toLearningInterviewPayload(nextAnswers, {
      userId: userId || 'guest',
      sessionId,
      sourceContext,
      sourceLabel,
      status: 'in_progress',
      currentStep: step
    });

    window.localStorage.setItem(`daksha:interview:${sourceContext}`, JSON.stringify(payload.session));

    if (userId) {
      await saveLearningSessionProgress(userId, payload.session);
    }
  };

  const handleResume = () => {
    const draftAnswers = resumeDraft?.answers || {};
    const draftStep = Number.isFinite(resumeDraft?.currentStep) ? resumeDraft.currentStep : 0;
    const draftSessionId = resumeDraft?.sessionId || sessionId;

    setSessionId(draftSessionId);
    setAnswers(draftAnswers);
    setCurrentStep(Math.min(draftStep, questions.length - 1));
    setMessages((prev) => [
      ...prev,
      {
        id: `${draftSessionId}-resume`,
        role: 'assistant',
        text: 'Resumed your interview draft. Continue where you left off.',
        animate: true
      }
    ]);
    setResumeDraft(null);

    setTimeout(() => {
      pushAssistantQuestion(Math.min(draftStep, questions.length - 1));
    }, 0);
  };

  const handleStartFresh = () => {
    const newSessionId = makeSessionId();
    setSessionId(newSessionId);
    setAnswers({});
    setCurrentStep(0);
    setMessages([
      {
        id: `${newSessionId}-fresh`,
        role: 'assistant',
        text: 'Great, starting a fresh interview now.',
        animate: true
      }
    ]);
    setResumeDraft(null);
    setTimeout(() => {
      pushAssistantQuestion(0);
    }, 0);
  };

  const setAnswerAndAdvance = async (value, skipped = false) => {
    if (!currentQuestion) return;

    const answerValue = skipped ? '' : String(value || '').trim();
    if (currentQuestion.required && !answerValue && !skipped) {
      return;
    }

    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: answerValue
    };

    setAnswers(nextAnswers);
    setMessages((prev) => [
      ...prev,
      {
        id: `${sessionId}-user-${currentQuestion.id}-${Date.now()}`,
        role: 'user',
        text: skipped ? 'Skipped' : answerValue
      }
    ]);

    const nextStep = currentStep + 1;
    await persistProgress(nextAnswers, nextStep);

    if (nextStep >= questions.length) {
      setSaving(true);
      const finalPayload = toLearningInterviewPayload(nextAnswers, {
        userId: userId || 'guest',
        sessionId,
        sourceContext,
        sourceLabel,
        status: 'completed',
        currentStep: nextStep
      });

      if (userId) {
        await completeLearningInterview(userId, finalPayload);
      }

      window.localStorage.removeItem(`daksha:interview:${sourceContext}`);
      setSaving(false);
      onComplete?.(finalPayload.session.answers);
      return;
    }

    setCurrentStep(nextStep);
    pushAssistantQuestion(nextStep);
  };

  const handleContinue = async () => {
    await setAnswerAndAdvance(input, false);
    setInput('');
  };

  const handleSkip = async () => {
    await setAnswerAndAdvance('', true);
    setInput('');
  };

  const handleBack = () => {
    if (currentStep <= 0) return;
    const previous = currentStep - 1;
    setCurrentStep(previous);
    const previousQuestion = questions[previous];
    setInput((answers[previousQuestion.id] || '').toString());
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    recognitionRef.current.start();
    setIsListening(true);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 p-3 sm:p-6">
      <div className="relative grid h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-slate-900/70 lg:grid-cols-[1.2fr_0.8fr]">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-300 hover:text-white">
          <X className="h-4 w-4" />
        </button>

        <div className="flex min-h-0 flex-col border-b border-slate-800 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-800 px-4 py-4 sm:px-6">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">AI Learning Interview</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Personalizing your learning system</h2>
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-400">Step {Math.min(currentStep + 1, questions.length)} of {questions.length}</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            {checkingResume ? <p className="text-sm text-slate-400">Checking for resumable interview...</p> : null}
            {resumeDraft ? (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                <p className="font-medium">Resume your previous interview?</p>
                <p className="mt-1 text-cyan-200/80">Found saved progress for this learning flow.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={handleResume} className="rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950">Resume</button>
                  <button onClick={handleStartFresh} className="rounded-full border border-cyan-300/40 px-3 py-1.5 text-xs text-cyan-100">Start Fresh</button>
                </div>
              </div>
            ) : null}

            {messages.map((message) => (
              <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`rounded-full p-2 ${message.role === 'user' ? 'bg-indigo-500/25 text-indigo-200' : 'bg-slate-800 text-cyan-200'}`}>
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-900 text-slate-200'}`}>
                  {message.animate ? <TypewriterText text={message.text} /> : <span>{message.text}</span>}
                </div>
              </div>
            ))}

            {saving ? <p className="text-sm text-cyan-300">Saving your interview to Firebase...</p> : null}
          </div>

          <div className="border-t border-slate-800 px-4 py-4 sm:px-6">
            <div className="mb-3 flex flex-wrap gap-2">
              {(currentQuestion?.options || []).map((option) => (
                <button
                  key={option}
                  onClick={() => setInput(option)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${input === option ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/40'}`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={currentQuestion?.placeholder || 'Type your answer...'}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
              <button onClick={startListening} className={`rounded-2xl border px-3 ${isListening ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
                <Mic className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={handleBack} disabled={currentStep === 0} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40">Back</button>
              <button onClick={handleSkip} className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300"><SkipForward className="h-3.5 w-3.5" /> Skip</button>
              <button onClick={handleContinue} className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-slate-950">Continue</button>
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-col bg-slate-925 lg:flex">
          <div className="border-b border-slate-800 px-6 py-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Answers</p>
            <p className="mt-1 text-sm text-slate-300">Edit any answer before completion.</p>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
            {questions.map((question, index) => (
              <button
                key={question.id}
                onClick={() => {
                  setCurrentStep(index);
                  setInput((answers[question.id] || '').toString());
                }}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-left hover:border-cyan-500/40"
              >
                <p className="text-xs text-slate-500">Q{index + 1}</p>
                <p className="mt-1 text-sm text-slate-200">{question.prompt}</p>
                <p className="mt-2 text-xs text-cyan-200/90">{answers[question.id] || 'Not answered yet'}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400"><Pencil className="h-3 w-3" /> Edit</span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-800 px-4 py-4">
            <button onClick={handleStartFresh} className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
              <RotateCcw className="h-3.5 w-3.5" /> Reset Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
