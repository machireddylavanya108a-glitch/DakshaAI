import { useEffect, useMemo, useState } from 'react';
import { UploadCloud, FileText, Sparkles, BookOpen, Search, Bookmark, Download, Trash2, Pencil, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDakshaLessonPackage } from '../services/aiService';
import { savePdfLearningRecord, getUserPdfLearning, deletePdfLearningRecord } from '../services/firestoreService';
import { buildPdfLearningModel, parsePdfLearningPayload } from '../utils/pdfLearningUtils';
import LoadingPDF from '../components/pdf/LoadingPDF';
import PDFViewer from '../components/pdf/PDFViewer';
import PDFOutline from '../components/pdf/PDFOutline';
import PDFSummary from '../components/pdf/PDFSummary';
import LessonCards from '../components/pdf/LessonCards';
import FormulaViewer from '../components/pdf/FormulaViewer';
import DiagramViewer from '../components/pdf/DiagramViewer';

export default function PDFLearning() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [model, setModel] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [savedRecords, setSavedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    getUserPdfLearning(user.uid).then(setSavedRecords).catch(() => setSavedRecords([]));
  }, [user]);

  const filteredPreview = useMemo(() => {
    if (!previewText) return '';
    if (!searchQuery.trim()) return previewText;
    return previewText.split(/\n+/).filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase())).join('\n');
  }, [previewText, searchQuery]);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);
    setError('');
    setModel(null);
    setLesson(null);
    setPreviewText('');
    setBookmarks([]);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = new TextDecoder().decode(arrayBuffer);
      const extractedText = text || '';
      const builtModel = buildPdfLearningModel(extractedText, selectedFile.name);
      setModel(builtModel);
      setPreviewText(builtModel.overview);

      const payload = await getDakshaLessonPackage(extractedText || builtModel.overview, 'pdf', selectedFile.name);
      const parsed = parsePdfLearningPayload(payload);
      setLesson(parsed);

      if (user?.uid) {
        await savePdfLearningRecord(user.uid, selectedFile.name, builtModel, parsed, {});
        const refreshed = await getUserPdfLearning(user.uid);
        setSavedRecords(refreshed);
      }
    } catch (err) {
      console.error(err);
      setError('The PDF could not be processed. Try a different file or a smaller document.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user?.uid) return;
    await deletePdfLearningRecord(user.uid, id);
    const refreshed = await getUserPdfLearning(user.uid);
    setSavedRecords(refreshed);
  };

  const handleBookmark = () => {
    if (!previewText) return;
    setBookmarks((prev) => (prev.includes(previewText.slice(0, 60)) ? prev : [...prev, previewText.slice(0, 60)]));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-indigo-950/50 to-cyan-950/50 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Professional PDF Learning Engine</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Turn any PDF into an interactive learning experience</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Upload a PDF, explore chapter structure, study AI-generated lessons, and save your learning sessions for later.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
            <UploadCloud className="h-4 w-4" /> Upload PDF
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {error && <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      </div>

      {loading && <LoadingPDF />}

      {model && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <PDFViewer fileName={file?.name || model.title} previewText={filteredPreview} onSearch={setSearchQuery} />
            <div className="flex flex-wrap gap-3">
              <button onClick={handleBookmark} className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200"><Bookmark className="mr-2 inline h-4 w-4" /> Bookmark Page</button>
              <button className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200"><Download className="mr-2 inline h-4 w-4" /> Download Notes</button>
              <button className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200"><RotateCcw className="mr-2 inline h-4 w-4" /> Restart</button>
            </div>
            <PDFSummary overview={model.overview} summary={lesson?.summary} keyPoints={lesson?.keyPoints || model.chapters} importantDefinitions={lesson?.importantDefinitions || model.definitions} />
          </div>
          <div className="space-y-6">
            <PDFOutline chapters={model.chapters} definitions={model.definitions} formulas={model.formulas} diagrams={model.diagrams || model.chapters} bookmarks={bookmarks} />
            <FormulaViewer formulas={model.formulas} />
            <DiagramViewer diagrams={model.chapters} />
          </div>
        </div>
      )}

      {lesson && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
            <h3 className="text-xl font-semibold text-white">AI Learning Package</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Beginner Lesson</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{lesson.beginnerLesson}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Intermediate Lesson</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{lesson.intermediateLesson}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Advanced Lesson</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{lesson.advancedLesson}</p>
              </div>
            </div>
          </div>
          <LessonCards lessons={[
            { title: 'Examples', content: lesson.examples?.join(' • ') || 'No examples generated.' },
            { title: 'Real-world Applications', content: lesson.realWorldApplications?.join(' • ') || 'No applications generated.' },
            { title: 'Revision Notes', content: lesson.revisionNotes?.join(' • ') || 'No revision notes generated.' },
            { title: 'Cheat Sheet', content: lesson.cheatSheet?.join(' • ') || 'No cheat sheet generated.' },
            { title: 'Flashcards', content: lesson.flashcards?.map((card) => card.front).join(' • ') || 'No flashcards generated.' },
            { title: 'Quiz', content: lesson.quiz?.map((item) => item.question).join(' • ') || 'No quiz generated.' },
          ]} />
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
        <div className="flex items-center gap-2 text-lg font-semibold text-white"><BookOpen className="h-5 w-5" /> Saved PDF Learning Sessions</div>
        <div className="mt-4 grid gap-3">
          {savedRecords.length === 0 ? <p className="text-sm text-slate-400">No saved sessions yet.</p> : savedRecords.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
              <div>
                <p className="font-medium text-white">{item.fileName}</p>
                <p className="text-sm text-slate-400">{item.analysis?.title || 'PDF learning session'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setModel(item.analysis); setLesson(item.lesson); setPreviewText(item.analysis?.overview || ''); }} className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200">Continue</button>
                <button onClick={() => handleDelete(item.id)} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"><Trash2 className="mr-2 inline h-4 w-4" />Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
