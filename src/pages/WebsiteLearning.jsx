import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveWebsiteLearningRecord, getUserWebsiteLearning, deleteWebsiteLearningRecord, renameWebsiteLearningRecord, saveWebsiteBookmark } from '../services/firestoreService';
import { runUniversalLearningPipeline } from '../services/universalLearningPipeline';
import LoadingWebsite from '../components/website/LoadingWebsite';
import WebsiteViewer from '../components/website/WebsiteViewer';
import WebsiteSummary from '../components/website/WebsiteSummary';
import ContentOutline from '../components/website/ContentOutline';
import SectionNavigator from '../components/website/SectionNavigator';
import LessonCards from '../components/website/LessonCards';

export default function WebsiteLearning() {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [model, setModel] = useState(null);
  const [session, setSession] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [renameId, setRenameId] = useState('');
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    getUserWebsiteLearning(user.uid).then((res) => setSavedSessions(res || [])).catch(() => setSavedSessions([]));
  }, [user?.uid]);

  const sections = useMemo(() => (model?.headings || []).slice(0, 8), [model]);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setModel(null);
    setSession(null);

    try {
      const result = await runUniversalLearningPipeline({
        url: url.trim(),
        sourceHint: 'website',
        sourceName: url.trim()
      });
      const modelData = result.sourceModel;
      setModel(modelData);
      setActiveSection(modelData.headings[0] || '');
      const parsed = result.learningSession;
      setSession(parsed);
      setNotes(parsed.summary || '');
      if (user?.uid) {
        await saveWebsiteLearningRecord(user.uid, {
          id: `web-${Date.now()}`,
          url: url.trim(),
          title: modelData.title,
          content: modelData.content,
          analysis: modelData,
          lesson: parsed,
          summary: parsed.summary,
          quiz: parsed.quiz,
          flashcards: parsed.flashcards,
          createdAt: new Date().toISOString(),
        });
        const fresh = await getUserWebsiteLearning(user.uid);
        setSavedSessions(fresh || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to analyze this website.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSession = (item) => {
    setUrl(item.url || '');
    setModel(item.analysis || null);
    setSession(item.lesson || null);
    setNotes(item.summary || '');
  };

  const handleBookmarkSection = async (section) => {
    if (!user?.uid || !section) return;
    try {
      await saveWebsiteBookmark(user.uid, { section, title: model?.title || 'Website lesson' });
      setActiveSection(section);
    } catch (err) {
      setError(err.message || 'Unable to bookmark this section.');
    }
  };

  const startRename = (item) => {
    setRenameId(item.id);
    setRenameValue(item.title || item.url || 'Website lesson');
  };

  const saveRename = async (id) => {
    if (!user?.uid) return;
    try {
      await renameWebsiteLearningRecord(user.uid, id, renameValue);
      const updated = savedSessions.map((item) => (item.id === id ? { ...item, title: renameValue } : item));
      setSavedSessions(updated);
      setRenameId('');
    } catch (err) {
      setError(err.message || 'Unable to rename lesson.');
    }
  };

  const deleteSession = async (id) => {
    if (!user?.uid) return;
    try {
      await deleteWebsiteLearningRecord(user.uid, id);
      const fresh = await getUserWebsiteLearning(user.uid);
      setSavedSessions(fresh || []);
      if (session?.id === id) setSession(null);
    } catch (err) {
      setError(err.message || 'Unable to delete lesson.');
    }
  };

  const exportNotes = () => {
    const blob = new Blob([notes || session?.summary || 'No notes available'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${model?.title || 'website-lesson'}-notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Professional Website Learning Engine</p>
              <h1 className="mt-2 text-4xl font-semibold text-white">Turn any webpage into an interactive learning experience</h1>
              <p className="mt-3 max-w-2xl text-slate-400">Paste a website, blog, article, or documentation URL and let AI extract the core ideas into lessons, flashcards, and quizzes.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste website URL" className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
              <button onClick={handleAnalyze} className="rounded-2xl bg-emerald-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-400">Analyze Website</button>
            </div>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <WebsiteViewer title={model?.title || 'Webpage content'} content={model?.content || ''} searchTerm={searchTerm} onSearch={setSearchTerm} />
            {loading ? <LoadingWebsite /> : null}
            {session ? <WebsiteSummary lesson={session} /> : null}
          </div>
          <div className="space-y-6">
            <SectionNavigator sections={sections} onSelectSection={(section) => { setActiveSection(section); handleBookmarkSection(section); }} />
            <ContentOutline headings={model?.headings || []} concepts={model?.concepts || []} definitions={model?.definitions || []} tables={model?.tables || []} images={model?.images || []} bookmarks={model?.bookmarks || []} />
            {session ? <LessonCards lesson={session} /> : null}
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <h3 className="text-xl font-semibold text-white">Download Notes</h3>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-4 min-h-[180px] w-full rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300 outline-none" />
              <button onClick={exportNotes} className="mt-4 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">Download Notes</button>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Saved Learning Sessions</p>
              <h3 className="text-xl font-semibold text-white">Continue, rename, and delete website lessons</h3>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {savedSessions.length === 0 ? <p className="text-sm text-slate-500">No saved website lessons yet.</p> : savedSessions.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  {renameId === item.id ? (
                    <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white" />
                  ) : (
                    <p className="font-medium text-white">{item.title || item.url || 'Website lesson'}</p>
                  )}
                  <p className="text-sm text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Saved recently'}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleLoadSession(item)} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">Continue</button>
                  {renameId === item.id ? (
                    <button onClick={() => saveRename(item.id)} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">Save</button>
                  ) : (
                    <button onClick={() => startRename(item)} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">Rename</button>
                  )}
                  <button onClick={() => deleteSession(item.id)} className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
