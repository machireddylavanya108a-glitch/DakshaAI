import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveYouTubeLearningRecord, getUserYouTubeLearning, deleteYouTubeLearningRecord, renameYouTubeLearningRecord, saveYouTubeBookmark } from '../services/firestoreService';
import { runUniversalLearningPipeline } from '../services/universalLearningPipeline';
import LoadingYouTube from '../components/youtube/LoadingYouTube';
import YouTubePlayer from '../components/youtube/YouTubePlayer';
import TranscriptViewer from '../components/youtube/TranscriptViewer';
import TimestampNavigator from '../components/youtube/TimestampNavigator';
import VideoSummary from '../components/youtube/VideoSummary';
import LessonCards from '../components/youtube/LessonCards';

export default function YouTubeLearning() {
  const { user } = useAuth();
  const [videoUrl, setVideoUrl] = useState('');
  const [model, setModel] = useState(null);
  const [session, setSession] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [notes, setNotes] = useState('');
  const [activeTimestamp, setActiveTimestamp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [renameId, setRenameId] = useState('');
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    getUserYouTubeLearning(user.uid).then((res) => setSavedSessions(res || [])).catch(() => setSavedSessions([]));
  }, [user?.uid]);

  const transcript = useMemo(() => model?.transcript || [], [model]);

  const handleLoadVideo = async () => {
    if (!videoUrl.trim()) return;

    setLoading(true);
    setError('');
    setModel(null);
    setSession(null);

    try {
      const parsedUrl = videoUrl.trim();
      const result = await runUniversalLearningPipeline({
        url: parsedUrl,
        sourceHint: 'youtube',
        sourceName: parsedUrl
      });

      const modelData = {
        ...result.sourceModel,
        videoUrl: parsedUrl,
        title: result.sourceModel.title || (parsedUrl.includes('shorts') ? 'YouTube Short' : 'YouTube Lesson'),
        chapters: (result.sourceModel.chapters || []).map((chapter) => ({ title: chapter?.title || chapter })),
        topics: result.sourceModel.topics || [],
        formulas: result.sourceModel.formulas || [],
        definitions: result.sourceModel.definitions || [],
        importantConcepts: result.learningSession.keyConcepts || [],
        bookmarks: result.sourceModel.bookmarks || []
      };
      setModel(modelData);
      const parsed = result.learningSession;
      setSession(parsed);
      setNotes(parsed.summary || '');
      if (user?.uid) {
        await saveYouTubeLearningRecord(user.uid, {
          id: `yt-${Date.now()}`,
          videoUrl: parsedUrl,
          videoTitle: modelData.title,
          transcript: modelData.transcript,
          analysis: modelData,
          lesson: parsed,
          summary: parsed.summary,
          quiz: parsed.quiz,
          flashcards: parsed.flashcards,
          createdAt: new Date().toISOString(),
        });
        const fresh = await getUserYouTubeLearning(user.uid);
        setSavedSessions(fresh || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to analyze this video.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSession = (item) => {
    setVideoUrl(item.videoUrl || '');
    setModel(item.analysis || null);
    setSession(item.lesson || null);
    setNotes(item.summary || '');
  };

  const handleBookmark = async (timestamp) => {
    if (!user?.uid || !timestamp) return;
    try {
      await saveYouTubeBookmark(user.uid, { timestamp, title: model?.title || 'Video' });
      setActiveTimestamp(timestamp);
    } catch (err) {
      setError(err.message || 'Unable to bookmark that timestamp.');
    }
  };

  const startRename = (item) => {
    setRenameId(item.id);
    setRenameValue(item.videoTitle || item.videoUrl || 'Video lesson');
  };

  const saveRename = async (id) => {
    if (!user?.uid) return;
    try {
      await renameYouTubeLearningRecord(user.uid, id, renameValue);
      const updated = savedSessions.map((item) => (item.id === id ? { ...item, videoTitle: renameValue } : item));
      setSavedSessions(updated);
      setRenameId('');
    } catch (err) {
      setError(err.message || 'Unable to rename lesson.');
    }
  };

  const deleteSession = async (id) => {
    if (!user?.uid) return;
    try {
      await deleteYouTubeLearningRecord(user.uid, id);
      const fresh = await getUserYouTubeLearning(user.uid);
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
    link.download = `${model?.title || 'youtube-lesson'}-notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(192,132,252,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-fuchsia-300">Professional YouTube Learning Engine</p>
              <h1 className="mt-2 text-4xl font-semibold text-white">Turn any educational video into a full AI study experience</h1>
              <p className="mt-3 max-w-2xl text-slate-400">Paste a YouTube URL, load the video, extract transcript and timestamps, and generate notes, quizzes, flashcards, and a roadmap.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="Paste YouTube URL or Shorts URL" className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
              <button onClick={handleLoadVideo} className="rounded-2xl bg-fuchsia-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-fuchsia-400">Load Video</button>
            </div>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <YouTubePlayer videoUrl={videoUrl} title={model?.title || 'Video'} onTimestampSelect={() => {}} />
            {loading ? <LoadingYouTube /> : null}
            {model ? <TranscriptViewer transcript={transcript} activeTimestamp={activeTimestamp} onTimestampSelect={setActiveTimestamp} /> : null}
            {session ? <VideoSummary lesson={session} /> : null}
          </div>
          <div className="space-y-6">
            <TimestampNavigator timestamps={model?.timestamps || []} onTimestampSelect={(timestamp) => { setActiveTimestamp(timestamp); handleBookmark(timestamp); }} />
            {session ? <LessonCards lesson={session} /> : null}
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <h3 className="text-xl font-semibold text-white">Chapters & Bookmarks</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                {(model?.chapters || []).map((chapter, index) => <div key={`${chapter.title}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">{chapter.title}</div>)}
                {(model?.bookmarks || []).length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">No bookmarks saved yet.</div> : model.bookmarks.map((bookmark, index) => <div key={`${bookmark.timestamp || index}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">{bookmark.timestamp} • {bookmark.title}</div>)}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <h3 className="text-xl font-semibold text-white">Download Notes</h3>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-4 min-h-[180px] w-full rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300 outline-none" />
              <button onClick={exportNotes} className="mt-4 rounded-2xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-400">Download Notes</button>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-fuchsia-300">Saved Learning Sessions</p>
              <h3 className="text-xl font-semibold text-white">Continue, rename, and delete lesson sessions</h3>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {savedSessions.length === 0 ? <p className="text-sm text-slate-500">No saved videos yet.</p> : savedSessions.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  {renameId === item.id ? (
                    <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white" />
                  ) : (
                    <p className="font-medium text-white">{item.videoTitle || item.videoUrl || 'Video lesson'}</p>
                  )}
                  <p className="text-sm text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Saved recently'}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleLoadSession(item)} className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-300">Continue</button>
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
