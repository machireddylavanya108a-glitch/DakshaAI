import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveDocxLearningRecord, getUserDocxLearning, deleteDocxLearningRecord } from '../services/firestoreService';
import { runUniversalLearningPipeline } from '../services/universalLearningPipeline';
import LoadingDOCX from '../components/docx/LoadingDOCX';
import DOCXViewer from '../components/docx/DOCXViewer';
import DOCXOutline from '../components/docx/DOCXOutline';

export default function DOCXLearning() {
  const { user } = useAuth();
  const [docxFile, setDocxFile] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    getUserDocxLearning(user.uid).then((res) => setSavedSessions(res || [])).catch(() => setSavedSessions([]));
  }, [user?.uid]);

  const filteredPreview = useMemo(() => {
    if (!previewText) return '';
    if (!searchTerm.trim()) return previewText;
    return previewText
      .split(/\n+/)
      .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
      .join('\n');
  }, [previewText, searchTerm]);

  const handleDocxUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDocxFile(file);
    setError('');
    setSession(null);
    setIsLoading(true);

    try {
      const result = await runUniversalLearningPipeline({
        file,
        sourceHint: 'docx'
      });
      const normalized = result.sourceModel;
      const unified = result.learningSession;
      setPreviewText(normalized.extractedText || normalized.overview || '');

      const parsed = {
        id: `docx-${Date.now()}`,
        title: unified.title || normalized.title || file.name,
        level: result.sourceMeta?.difficulty || 'Structured',
        summary: unified.summary,
        objectives: unified.keyConcepts || [],
        lessons: [
          { title: 'Beginner', content: unified.beginnerLesson || '' },
          { title: 'Intermediate', content: unified.intermediateLesson || '' },
          { title: 'Advanced', content: unified.advancedLesson || '' }
        ],
        outline: {
          sections: normalized.sections || normalized.chapters || [],
          definitions: unified.importantDefinitions || normalized.definitions || [],
          tables: normalized.tables || [],
          concepts: unified.keyConcepts || normalized.concepts || [],
          bookmarks: normalized.bookmarks || []
        },
        keyConcepts: unified.keyConcepts || [],
        importantDefinitions: unified.importantDefinitions || [],
        examples: unified.examples || [],
        realWorldApplications: unified.realWorldApplications || [],
        revisionNotes: unified.revisionNotes || [],
        cheatSheet: unified.cheatSheet || [],
        flashcards: unified.flashcards || [],
        quiz: unified.quiz || [],
        mindMap: unified.mindMap || '',
        learningRoadmap: unified.learningRoadmap || []
      };

      setSession(parsed);
      if (user?.uid) {
        await saveDocxLearningRecord(user.uid, {
          id: `docx-${Date.now()}`,
          fileName: file.name,
          createdAt: new Date().toISOString(),
          package: parsed,
          previewText: normalized.extractedText || normalized.overview || '',
        });
        const fresh = await getUserDocxLearning(user.uid);
        setSavedSessions(fresh || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to process that DOCX file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSession = (item) => {
    setSession(item.package || item);
    setPreviewText(item.previewText || '');
    setDocxFile(null);
  };

  const handleDeleteSession = async (id) => {
    if (!user?.uid) return;
    try {
      await deleteDocxLearningRecord(user.uid, id);
      const fresh = await getUserDocxLearning(user.uid);
      setSavedSessions(fresh || []);
      if (session?.id === id) {
        setSession(null);
      }
    } catch (err) {
      setError(err.message || 'Unable to delete that session.');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Professional DOCX Learning Engine</p>
              <h1 className="mt-2 text-4xl font-semibold text-white">Turn any .docx into a structured lesson plan</h1>
              <p className="mt-3 max-w-2xl text-slate-400">Upload a document, extract its structure, and let AI transform it into a polished study experience with lessons, summaries, and outline support.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-400">
              <input type="file" accept=".docx" className="hidden" onChange={handleDocxUpload} />
              Upload DOCX
            </label>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DOCXViewer fileName={docxFile?.name} previewText={filteredPreview} onSearch={setSearchTerm} />
          <DOCXOutline
            sections={session?.outline?.sections?.map((item) => item?.title || item) || []}
            definitions={session?.outline?.definitions?.map((item) => item?.term || item?.title || item) || []}
            tables={session?.outline?.tables?.map((item) => item?.title || item) || []}
            concepts={session?.outline?.concepts?.map((item) => item?.title || item) || []}
            bookmarks={session?.outline?.bookmarks?.map((item) => item?.title || item) || []}
          />
        </div>

        {isLoading ? <LoadingDOCX /> : null}

        {session && (
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">AI Lesson Package</p>
                <h3 className="text-xl font-semibold text-white">{session.title}</h3>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                {session.level || 'Structured'}
              </div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <h4 className="text-lg font-semibold text-white">Summary</h4>
                <p className="mt-3 text-sm leading-7 text-slate-300">{session.summary}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <h4 className="text-lg font-semibold text-white">Learning Objectives</h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {session.objectives?.map((item) => <li key={item} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">{item}</li>)}
                </ul>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <h4 className="text-lg font-semibold text-white">Lessons</h4>
              <div className="mt-4 space-y-4">
                {session.lessons?.map((lesson, index) => (
                  <div key={`${lesson.title}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <h5 className="text-base font-semibold text-white">{lesson.title}</h5>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{lesson.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Saved DOCX Sessions</p>
              <h3 className="text-xl font-semibold text-white">Reopen a previous document lesson</h3>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {savedSessions.length === 0 ? <p className="text-sm text-slate-500">No saved DOCX sessions yet.</p> : savedSessions.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-white">{item.fileName || 'DOCX session'}</p>
                  <p className="text-sm text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Saved recently'}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleLoadSession(item)} className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">Open</button>
                  <button onClick={() => handleDeleteSession(item.id)} className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
