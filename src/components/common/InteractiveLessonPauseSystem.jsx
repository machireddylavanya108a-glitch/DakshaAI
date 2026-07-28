import { useMemo, useState } from 'react';
import { Bot, Pause, Play, SkipBack, SkipForward, Repeat, FastForward, Mic } from 'lucide-react';
import { getDakshaResponse } from '../../services/aiService';
import { buildInteractiveLessonPrompt, parseInteractiveLessonResponse } from '../../utils/interactiveLessonEngine.js';
import {
  saveAiConversation,
  saveLearningState,
  savePausedLesson,
  saveQuestionHistory
} from '../../services/firestoreService';

function detectLanguage(question = '') {
  const normalized = String(question || '').toLowerCase();
  if (normalized.includes('telugu')) return 'Telugu';
  if (normalized.includes('hindi')) return 'Hindi';
  if (normalized.includes('translate')) return 'English';
  return 'English';
}

function detectStyle(question = '') {
  const normalized = String(question || '').toLowerCase();
  if (normalized.includes('easier')) return 'simple';
  if (normalized.includes('deeper')) return 'deep';
  if (normalized.includes('summarize')) return 'summary';
  if (normalized.includes('compare')) return 'comparison';
  return 'balanced';
}

function detectDifficulty(question = '') {
  const normalized = String(question || '').toLowerCase();
  if (normalized.includes('slow down')) return 'easy';
  if (normalized.includes('deeper')) return 'advanced';
  return 'normal';
}

function buildVisualSupport(answer = '', question = '') {
  const normalized = `${question} ${answer}`.toLowerCase();
  return {
    imageHint: normalized.includes('example') ? 'Example image card suggested.' : 'Concept snapshot suggested.',
    diagramHint: normalized.includes('compare') ? 'Comparison diagram generated.' : 'Flow diagram generated.',
    animationHint: normalized.includes('animation') || normalized.includes('show in 3d') ? 'Animation cue ready.' : 'No extra animation requested.',
    modelHighlightHint: normalized.includes('what is this') ? 'Highlighted current selected model part.' : 'No model highlight change.',
    whiteboardHint: normalized.includes('why') || normalized.includes('what happens if') ? 'Whiteboard reasoning steps prepared.' : 'Whiteboard summary prepared.'
  };
}

export default function InteractiveLessonPauseSystem({
  lessonType = 'general',
  userId,
  topic,
  captureState,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onRepeat,
  onSkip,
  onRestoreState
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [memory, setMemory] = useState({
    conceptsNotUnderstood: [],
    languagesUsed: ['English'],
    preferredStyle: 'balanced',
    difficultyLevel: 'normal'
  });

  const canResume = Boolean(snapshot);

  const saveSessionMemory = async (nextMemory, lastState) => {
    if (!userId) return;
    await saveLearningState(userId, {
      lessonType,
      topic,
      conceptsNotUnderstood: nextMemory.conceptsNotUnderstood,
      languagesUsed: nextMemory.languagesUsed,
      preferredStyle: nextMemory.preferredStyle,
      difficultyLevel: nextMemory.difficultyLevel,
      lastState
    });
  };

  const handleAskAiOpen = async () => {
    const lessonState = captureState?.() || {};
    setSnapshot(lessonState);
    onPause?.();
    setAssistantOpen(true);

    if (userId) {
      await Promise.all([
        savePausedLesson(userId, {
          lessonType,
          topic,
          sessionId: lessonState.sessionId || '',
          state: lessonState
        }),
        saveLearningState(userId, {
          lessonType,
          topic,
          conceptsNotUnderstood: memory.conceptsNotUnderstood,
          languagesUsed: memory.languagesUsed,
          preferredStyle: memory.preferredStyle,
          difficultyLevel: memory.difficultyLevel,
          lastState: lessonState
        })
      ]);
    }
  };

  const handleAskQuestion = async () => {
    const text = String(question || '').trim();
    if (!text || loading) return;

    const language = detectLanguage(text);
    const preferredStyle = detectStyle(text);
    const difficultyLevel = detectDifficulty(text);

    setLoading(true);
    try {
      const stateContext = snapshot ? JSON.stringify(snapshot).slice(0, 1800) : 'No state captured';
      const prompt = buildInteractiveLessonPrompt({
        topic: topic || 'General Lesson',
        question: text,
        snapshot: snapshot || { stateContext },
        conversation,
        language,
        preferredStyle
      });

      const answer = await getDakshaResponse(prompt, language);
      const parsed = parseInteractiveLessonResponse(answer);
      const richAnswer = [
        parsed.voice || answer,
        parsed.threeD ? `\n\n3D: ${parsed.threeD}` : '',
        parsed.diagram ? `\n\nDiagram: ${parsed.diagram}` : '',
        parsed.animation ? `\n\nAnimation: ${parsed.animation}` : '',
        parsed.whiteboard ? `\n\nWhiteboard: ${parsed.whiteboard}` : '',
        parsed.example ? `\n\nExample: ${parsed.example}` : '',
        parsed.resume ? `\n\nResume: ${parsed.resume}` : ''
      ].join('').trim();
      const visualSupport = buildVisualSupport(richAnswer, text);

      const nextConversation = [
        ...conversation,
        {
          question: text,
          answer: richAnswer,
          language,
          preferredStyle,
          difficultyLevel,
          visualSupport,
          createdAt: Date.now()
        }
      ];

      const nextMemory = {
        conceptsNotUnderstood: /(explain again|easier|why|what happens if)/i.test(text)
          ? Array.from(new Set([...memory.conceptsNotUnderstood, snapshot?.currentTopic || topic || 'current concept']))
          : memory.conceptsNotUnderstood,
        languagesUsed: Array.from(new Set([...memory.languagesUsed, language])),
        preferredStyle,
        difficultyLevel
      };

      setConversation(nextConversation);
      setMemory(nextMemory);
      setQuestion('');

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(richAnswer);
        utterance.lang = language === 'Hindi' ? 'hi-IN' : language === 'Telugu' ? 'te-IN' : 'en-US';
        window.speechSynthesis.speak(utterance);
      }

      if (userId) {
        await Promise.all([
          saveQuestionHistory(userId, {
            lessonType,
            topic,
            question: text,
            answer: richAnswer,
            language,
            explanationStyle: preferredStyle
          }),
          saveAiConversation(userId, {
            lessonType,
            topic,
            messages: nextConversation.map((item) => ({
              role: 'learner',
              question: item.question,
              answer: item.answer,
              language: item.language,
              style: item.preferredStyle,
              difficulty: item.difficultyLevel,
              visualSupport: item.visualSupport,
              createdAt: item.createdAt
            }))
          }),
          saveSessionMemory(nextMemory, snapshot || {})
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const latestVisual = useMemo(() => {
    if (!conversation.length) return null;
    return conversation[conversation.length - 1].visualSupport;
  }, [conversation]);

  return (
    <>
      <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Global Pause System</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button type="button" onClick={onPlay} className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100"><Play className="mr-1 inline h-4 w-4" />Play</button>
          <button type="button" onClick={onPause} className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100"><Pause className="mr-1 inline h-4 w-4" />Pause</button>
          <button type="button" onClick={onNext} className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100"><SkipForward className="mr-1 inline h-4 w-4" />Next</button>
          <button type="button" onClick={onPrevious} className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100"><SkipBack className="mr-1 inline h-4 w-4" />Previous</button>
          <button type="button" onClick={onRepeat} className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100"><Repeat className="mr-1 inline h-4 w-4" />Repeat</button>
          <button type="button" onClick={onSkip} className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100"><FastForward className="mr-1 inline h-4 w-4" />Skip</button>
          <button type="button" onClick={handleAskAiOpen} className="rounded-xl bg-cyan-500 px-3 py-2 font-semibold text-slate-950"><Mic className="mr-1 inline h-4 w-4" />Ask AI</button>
        </div>
      </section>

      {assistantOpen ? (
        <div className="fixed bottom-4 right-4 z-[70] w-[min(96vw,460px)] rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300"><Bot className="mr-1 inline h-4 w-4" />Floating AI Assistant</p>
            <button type="button" onClick={() => setAssistantOpen(false)} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200">Close</button>
          </div>

          <div className="max-h-52 space-y-2 overflow-auto rounded-xl border border-white/10 bg-slate-900/60 p-2">
            {conversation.length === 0 ? <p className="text-xs text-slate-400">Ask anything. Lesson stays paused and state is preserved.</p> : conversation.map((item, index) => (
              <div key={`${item.createdAt}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-xs">
                <p className="text-cyan-200">Q: {item.question}</p>
                <p className="mt-1 text-slate-200">A: {item.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAskQuestion();
                }
              }}
              placeholder="Ask anything..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none"
            />
            <button type="button" onClick={handleAskQuestion} className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">{loading ? '...' : 'Ask'}</button>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs text-slate-300">
            <p>Memory: languages [{memory.languagesUsed.join(', ')}], style [{memory.preferredStyle}], difficulty [{memory.difficultyLevel}]</p>
            <p className="mt-1">Concepts not understood: {memory.conceptsNotUnderstood.length ? memory.conceptsNotUnderstood.join(', ') : 'None yet'}</p>
            {latestVisual ? (
              <div className="mt-2 space-y-1 text-[11px] text-cyan-100">
                <p>Image: {latestVisual.imageHint}</p>
                <p>Diagram: {latestVisual.diagramHint}</p>
                <p>Animation: {latestVisual.animationHint}</p>
                <p>3D highlight: {latestVisual.modelHighlightHint}</p>
                <p>Whiteboard: {latestVisual.whiteboardHint}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={!canResume}
              onClick={() => {
                if (snapshot) onRestoreState?.(snapshot);
                onPlay?.();
                setAssistantOpen(false);
              }}
              className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue Lesson
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
