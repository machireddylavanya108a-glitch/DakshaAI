import { useMemo } from 'react';

function DomainPanel({ classification, chapterTitle }) {
  const safeClassification = classification && typeof classification === 'object'
    ? classification
    : {
      domain: 'Custom',
      subDomain: chapterTitle || 'Open Topic',
      visualization: 'Adaptive',
      objectCategory: 'Dynamic',
      interactionCategory: 'Generic Exploration'
    };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Adaptive Scene Profile</p>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">Domain: {safeClassification.domain || 'Custom'}</div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">SubDomain: {safeClassification.subDomain || chapterTitle || 'Open Topic'}</div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">Visualization: {safeClassification.visualization || 'Adaptive'}</div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">Object Category: {safeClassification.objectCategory || 'Dynamic'}</div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">Interaction: {safeClassification.interactionCategory || 'Generic Exploration'}</div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">Animation: {safeClassification.animationCategory || 'Guided Motion'}</div>
      </div>
    </div>
  );
}

export default function LessonPlayer({ topic, chapter, step, displayedText, captionsEnabled, subtitleText, onWhiteboardAction, sceneClassification = null }) {
  const derivedClassification = useMemo(() => {
    if (sceneClassification && typeof sceneClassification === 'object') return sceneClassification;
    return {
      domain: 'Custom',
      subDomain: String(topic || chapter?.title || 'Open Topic'),
      visualization: 'Adaptive',
      objectCategory: 'Dynamic',
      interactionCategory: 'Generic Exploration',
      animationCategory: 'Guided Motion'
    };
  }, [sceneClassification, topic, chapter?.title]);

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
        <DomainPanel classification={derivedClassification} chapterTitle={chapter?.title || 'Lesson'} />
      </div>
    </section>
  );
}
