import { AlertTriangle, Beaker, Braces, Building2, Calculator, Dna, ScrollText, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';

function identifyDomain(topic = '') {
  const normalized = String(topic || '').toLowerCase();
  if (/(code|programming|javascript|python|react|java|c\+\+)/.test(normalized)) return 'code';
  if (/(math|algebra|calculus|equation|geometry|statistics)/.test(normalized)) return 'math';
  if (/(science|physics|chemistry|biology|experiment)/.test(normalized)) return 'science';
  if (/(history|civilization|war|empire|timeline)/.test(normalized)) return 'history';
  if (/(business|finance|startup|market|strategy)/.test(normalized)) return 'business';
  if (/(medical|anatomy|clinical|nursing|surgery)/.test(normalized)) return 'medical';
  if (/(engineering|machine|mechanical|electrical|assembly)/.test(normalized)) return 'engineering';
  return 'general';
}

function DomainPanel({ domain, chapterTitle }) {
  const [codeInput, setCodeInput] = useState('console.log("Hello Daksha AI");');
  const [codeOutput, setCodeOutput] = useState('');
  const [equationInput, setEquationInput] = useState('2x + 4 = 10');

  if (domain === 'code') {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="mb-2 flex items-center gap-2 text-cyan-200"><Braces className="h-4 w-4" /> Live Code Editor</div>
        <textarea value={codeInput} onChange={(event) => setCodeInput(event.target.value)} className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-slate-100" />
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => {
            try {
              // eslint-disable-next-line no-new-func
              const result = new Function(codeInput)();
              setCodeOutput(typeof result === 'undefined' ? 'Code executed successfully.' : String(result));
            } catch (error) {
              setCodeOutput(`Debug: ${error.message}`);
            }
          }} className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950">Run Code</button>
          <button type="button" onClick={() => setCodeOutput('Try checking variable names, syntax, and semicolons.')} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">Debug Help</button>
        </div>
        <p className="mt-2 text-xs text-slate-300 whitespace-pre-wrap">{codeOutput || 'Output will appear here.'}</p>
      </div>
    );
  }

  if (domain === 'math') {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="mb-2 flex items-center gap-2 text-cyan-200"><Calculator className="h-4 w-4" /> Math Assistant</div>
        <input value={equationInput} onChange={(event) => setEquationInput(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
        <p className="mt-2 text-xs text-slate-300">Step-by-step: isolate variable, simplify both sides, verify result. Interactive graph mode is enabled for chapter: {chapterTitle}.</p>
      </div>
    );
  }

  if (domain === 'science') {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200"><div className="mb-2 flex items-center gap-2 text-cyan-200"><Beaker className="h-4 w-4" /> Science Lab</div>Animations, experiment cards, and simulation prompts are active for this lesson.</div>;
  }

  if (domain === 'history') {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200"><div className="mb-2 flex items-center gap-2 text-cyan-200"><ScrollText className="h-4 w-4" /> History Explorer</div>Timeline, map context, and historical reconstruction cues are active.</div>;
  }

  if (domain === 'business') {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200"><div className="mb-2 flex items-center gap-2 text-cyan-200"><Building2 className="h-4 w-4" /> Business Analyzer</div>Chart ideas, case studies, and market analysis prompts are active.</div>;
  }

  if (domain === 'medical') {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <div className="mb-2 flex items-center gap-2"><Dna className="h-4 w-4" /> Medical Teaching</div>
        <p className="mb-1">Anatomy and procedure simulation cues are active.</p>
        <div className="inline-flex items-center gap-1 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Safety warning: Always verify against licensed medical resources.</div>
      </div>
    );
  }

  if (domain === 'engineering') {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200"><div className="mb-2 flex items-center gap-2 text-cyan-200"><Wrench className="h-4 w-4" /> Engineering View</div>Machine components, assembly sequence, and exploded-view explanation enabled.</div>;
  }

  return null;
}

export default function LessonPlayer({ topic, chapter, step, displayedText, captionsEnabled, subtitleText, onWhiteboardAction }) {
  const domain = useMemo(() => identifyDomain(topic), [topic]);

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30" aria-live="polite" aria-label="Interactive lesson player">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Interactive Lesson Player</p>
      <h2 className="mt-2 text-xl font-semibold text-white">{chapter?.title || 'Lesson'}</h2>
      <p className="mt-1 text-xs text-slate-400">Flow: Explain one idea → Show visual → Give example → Ask learner → Continue</p>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Teaching Step</p>
        <p className="mt-1 text-sm font-semibold text-cyan-200">{step?.label || 'Introduction'}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">{displayedText || step?.content || ''}</p>

        {captionsEnabled ? (
          <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 text-xs text-indigo-100">
            Caption: {displayedText || step?.content || ''}
          </div>
        ) : null}
        {subtitleText ? (
          <div className="mt-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-xs text-cyan-100">
            Subtitle: {subtitleText}
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <button type="button" onClick={() => onWhiteboardAction('draw')} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-white">Draw</button>
        <button type="button" onClick={() => onWhiteboardAction('highlight')} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-white">Highlight</button>
        <button type="button" onClick={() => onWhiteboardAction('formula')} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-white">Formula</button>
        <button type="button" onClick={() => onWhiteboardAction('flowchart')} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-white">Flowchart</button>
      </div>

      <div className="mt-4">
        <DomainPanel domain={domain} chapterTitle={chapter?.title || 'Lesson'} />
      </div>
    </section>
  );
}
