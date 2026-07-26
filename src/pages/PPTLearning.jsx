import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { useAuth } from '../context/AuthContext';
import { savePptLearningRecord, getUserPptLearning, deletePptLearningRecord, renamePptLearningRecord } from '../services/firestoreService';
import { generatePptLearningPackage } from '../services/aiService';
import { buildPptLearningModel, parsePptLearningPayload } from '../utils/pptLearningUtils';
import LoadingPPT from '../components/ppt/LoadingPPT';
import PPTViewer from '../components/ppt/PPTViewer';
import SlideNavigator from '../components/ppt/SlideNavigator';
import SlideCard from '../components/ppt/SlideCard';
import PresentationSummary from '../components/ppt/PresentationSummary';
import ChartViewer from '../components/ppt/ChartViewer';
import ImageViewer from '../components/ppt/ImageViewer';

export default function PPTLearning() {
  const { user } = useAuth();
  const [presentationFile, setPresentationFile] = useState(null);
  const [model, setModel] = useState(null);
  const [session, setSession] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [renameId, setRenameId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    getUserPptLearning(user.uid).then((res) => setSavedSessions(res || [])).catch(() => setSavedSessions([]));
  }, [user?.uid]);

  const filteredSlides = useMemo(() => {
    if (!model?.slides?.length) return [];
    if (!searchTerm.trim()) return model.slides;
    return model.slides.filter((slide) => {
      const haystack = `${slide.title} ${slide.text?.join(' ') || ''} ${slide.bullets?.join(' ') || ''}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [model, searchTerm]);

  const processPresentationFile = async (file) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.pptx') && !lowerName.endsWith('.ppt')) {
      setError('Only .ppt and .pptx files are supported.');
      return;
    }
    if (lowerName.endsWith('.ppt')) {
      setError('Legacy .ppt files are not supported in this engine. Please upload a .pptx file instead.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('This presentation is large. Processing may take a little longer.');
    }

    setIsLoading(true);
    setError('');
    setModel(null);
    setSession(null);
    setPresentationFile(file);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideEntries = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).sort();
      if (!slideEntries.length) {
        throw new Error('No slides were found in this presentation.');
      }

      const presentationSlides = [];
      const notes = [];
      const charts = [];
      const images = [];
      const tables = [];
      const diagrams = [];

      for (let index = 0; index < slideEntries.length; index += 1) {
        const entry = slideEntries[index];
        const xml = await zip.files[entry].async('string').catch(() => '');
        const textFragments = Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/gs)).map((match) => match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()).filter(Boolean);
        const title = textFragments[0] || `Slide ${index + 1}`;
        const body = textFragments.slice(1);
        presentationSlides.push({
          id: `slide-${index + 1}`,
          title,
          text: body.length ? [body.join(' ')] : [],
          bullets: body.length ? body : textFragments.slice(0, 3),
          tables: [],
          charts: [],
          diagrams: [],
          images: [],
          notes: [],
        });

        if (/<c:chart/i.test(xml)) charts.push({ title: `Chart ${index + 1}`, type: 'Chart', description: 'Chart detected in the slide.' });
        if (/<p:pic/i.test(xml) || /<a:blip/i.test(xml)) images.push({ alt: `Image ${index + 1}`, description: 'Image detected in the slide.' });
        if (/<a:graphicFrame/i.test(xml) && /<a:tbl/i.test(xml)) tables.push({ title: `Table ${index + 1}`, description: 'Table detected in the slide.' });
        if (/<p:graphicFrame/i.test(xml) || /<a:diagram/i.test(xml)) diagrams.push({ title: `Diagram ${index + 1}`, description: 'Diagram detected in the slide.' });
      }

      const noteEntries = Object.keys(zip.files).filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(name)).sort();
      for (const noteEntry of noteEntries) {
        const xml = await zip.files[noteEntry].async('string').catch(() => '');
        const noteFragments = Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/gs)).map((match) => match[1].trim()).filter(Boolean);
        if (noteFragments.length) notes.push(noteFragments.join(' '));
      }

      const modelData = buildPptLearningModel({
        title: file.name.replace(/\.[^/.]+$/, ''),
        slides: presentationSlides,
        notes,
        charts,
        images,
        tables,
        diagrams,
        overview: presentationSlides.map((slide) => `${slide.title}\n${(slide.bullets || []).join('\n')}`).join('\n\n'),
      });
      setModel(modelData);
      setActiveSlide(0);
      const payload = await generatePptLearningPackage(file.name, modelData, user?.uid || 'guest');
      const parsed = parsePptLearningPayload(payload);
      setSession(parsed);
      setNotes(parsed.summary || '');
      if (user?.uid) {
        await savePptLearningRecord(user.uid, { id: `ppt-${Date.now()}`, fileName: file.name, slides: modelData.slides, analysis: modelData, lesson: parsed, summary: parsed.summary, quiz: parsed.quiz, flashcards: parsed.flashcards, createdAt: new Date().toISOString() });
        const fresh = await getUserPptLearning(user.uid);
        setSavedSessions(fresh || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to process this presentation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processPresentationFile(file);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await processPresentationFile(file);
    }
  };

  const handleLoadSession = (item) => {
    setPresentationFile({ name: item.fileName });
    setModel(item.analysis || null);
    setSession(item.lesson || null);
    setNotes(item.summary || '');
    setActiveSlide(0);
  };

  const startRename = (item) => {
    setRenameId(item.id);
    setRenameValue(item.fileName || 'Presentation');
  };

  const saveRename = async (id) => {
    if (!user?.uid) return;
    try {
      await renamePptLearningRecord(user.uid, id, renameValue);
      const updated = savedSessions.map((item) => item.id === id ? { ...item, fileName: renameValue } : item);
      setSavedSessions(updated);
      setRenameId('');
    } catch (err) {
      setError(err.message || 'Unable to rename presentation.');
    }
  };

  const deleteSession = async (id) => {
    if (!user?.uid) return;
    try {
      await deletePptLearningRecord(user.uid, id);
      const fresh = await getUserPptLearning(user.uid);
      setSavedSessions(fresh || []);
      if (session?.id === id) setSession(null);
    } catch (err) {
      setError(err.message || 'Unable to delete presentation.');
    }
  };

  const exportNotes = () => {
    const blob = new Blob([notes || session?.summary || 'No notes available'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${presentationFile?.name || 'presentation'}-notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Professional PPT Learning Engine</p>
              <h1 className="mt-2 text-4xl font-semibold text-white">Convert presentations into powerful AI lessons</h1>
              <p className="mt-3 max-w-2xl text-slate-400">Upload a PPT or PPTX, extract slides, analyze visuals, and transform the material into a complete study package.</p>
            </div>
            <label
              ref={dropZoneRef}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`inline-flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-4 font-medium text-slate-950 transition ${dragActive ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200' : 'border-cyan-500/40 bg-cyan-500 px-5 py-3 text-slate-950 hover:bg-cyan-400'}`}
            >
              <input type="file" accept=".ppt,.pptx" className="hidden" onChange={handleUpload} />
              <span>Upload or Drop Presentation</span>
              <span className="mt-1 text-xs font-normal uppercase tracking-[0.3em] text-slate-700">.pptx preferred</span>
            </label>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <PPTViewer title={presentationFile?.name || model?.title} slides={filteredSlides} activeSlide={activeSlide} onSelectSlide={setActiveSlide} searchTerm={searchTerm} onSearch={setSearchTerm} />
            {isLoading ? <LoadingPPT /> : null}
            {model?.slides?.[activeSlide] ? <SlideCard slide={model.slides[activeSlide]} index={activeSlide} /> : null}
            {session ? <PresentationSummary session={session} /> : null}
          </div>
          <div className="space-y-6">
            <SlideNavigator slides={model?.slides || []} activeSlide={activeSlide} onSelectSlide={setActiveSlide} />
            <ChartViewer charts={model?.charts || []} />
            <ImageViewer images={model?.images || []} />
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <h3 className="text-xl font-semibold text-white">Bookmarks</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                {(model?.bookmarks || []).length === 0 ? <p>No bookmarks yet.</p> : model.bookmarks.map((bookmark, index) => <div key={`${bookmark}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">{bookmark}</div>)}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <h3 className="text-xl font-semibold text-white">AI Notes</h3>
              <textarea value={notes || session?.summary || ''} onChange={(event) => setNotes(event.target.value)} className="mt-4 min-h-[180px] w-full rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300 outline-none" />
              <button onClick={exportNotes} className="mt-4 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">Download AI Notes</button>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Saved Presentations</p>
              <h3 className="text-xl font-semibold text-white">Continue, rename, or remove presentations</h3>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {savedSessions.length === 0 ? <p className="text-sm text-slate-500">No presentations saved yet.</p> : savedSessions.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  {renameId === item.id ? (
                    <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white" />
                  ) : (
                    <p className="font-medium text-white">{item.fileName || 'Presentation'}</p>
                  )}
                  <p className="text-sm text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Saved recently'}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleLoadSession(item)} className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">Continue</button>
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
