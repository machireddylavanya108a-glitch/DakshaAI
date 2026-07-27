import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveCameraLearningRecord, getUserCameraLearning, deleteCameraLearningRecord, renameCameraLearningRecord, saveCameraBookmark } from '../services/firestoreService';
import { runUniversalLearningPipeline } from '../services/universalLearningPipeline';
import CameraCapture from '../components/camera/CameraCapture';
import OCRPreview from '../components/camera/OCRPreview';
import ExtractedText from '../components/camera/ExtractedText';
import OCRSummary from '../components/camera/OCRSummary';
import LessonCards from '../components/camera/LessonCards';
import LoadingOCR from '../components/camera/LoadingOCR';

export default function CameraLearning() {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [renameId, setRenameId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [fileName, setFileName] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getUserCameraLearning(user.uid).then((res) => setSavedSessions(res || [])).catch(() => setSavedSessions([]));
  }, [user?.uid]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const sections = useMemo(() => {
    const detected = analysis?.detectedElements || {};
    return [
      ...(detected.headings || []),
      ...(detected.paragraphs || []),
      ...(detected.tables || []),
      ...(detected.codeSnippets || []),
      ...(detected.concepts || [])
    ].slice(0, 10);
  }, [analysis]);

  const handleUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('image/')) {
      setError('Unsupported image format. Please upload a JPG, PNG, or WEBP file.');
      return;
    }
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError('');
    setOcrText('');
  };

  const handleAnalyze = async () => {
    if (!file && !previewUrl) return;
    setLoading(true);
    setError('');
    setAnalysis(null);
    setLesson(null);

    try {
      const result = await runUniversalLearningPipeline({
        file,
        sourceHint: 'camera-ocr',
        ocrText: ocrText || 'Captured image content pending OCR extraction.',
        sourceName: fileName || 'camera-image'
      });

      const lessonPayload = result.learningSession;
      const analysisPayload = {
        summary: lessonPayload.summary,
        detectedElements: {
          headings: result.sourceModel.headings || [],
          paragraphs: result.sourceModel.subheadings || [],
          tables: result.sourceModel.tables || [],
          handwrittenText: [],
          formulas: result.sourceModel.formulas || [],
          diagrams: result.sourceModel.diagrams || [],
          codeSnippets: result.sourceModel.codeBlocks || [],
          concepts: lessonPayload.keyConcepts || []
        },
        keyConcepts: lessonPayload.keyConcepts || [],
        definitions: lessonPayload.importantDefinitions || [],
        formulas: result.sourceModel.formulas || [],
        diagrams: result.sourceModel.diagrams || [],
        qualityWarnings: []
      };

      setAnalysis(analysisPayload);
      setLesson(lessonPayload);
      setOcrText(result.sourceModel.extractedText || ocrText || 'No OCR text extracted.');

      if (user?.uid) {
        await saveCameraLearningRecord(user.uid, {
          id: `camera-${Date.now()}`,
          imageName: fileName || 'camera-image',
          ocrText: result.sourceModel.extractedText || ocrText || '',
          analysis: analysisPayload,
          lesson: lessonPayload,
          summary: lessonPayload.summary,
          quiz: lessonPayload.quiz,
          flashcards: lessonPayload.flashcards,
          createdAt: new Date().toISOString()
        });
        const fresh = await getUserCameraLearning(user.uid);
        setSavedSessions(fresh || []);
      }
    } catch (err) {
      setError(err.message || 'OCR processing failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError('Camera access was blocked or unavailable.');
    }
  };

  const handleCaptureFromCamera = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    const blob = await fetch(dataUrl).then((r) => r.blob());
    const nextFile = new File([blob], 'camera-capture.png', { type: 'image/png' });
    setFile(nextFile);
    setFileName(nextFile.name);
    setPreviewUrl(dataUrl);
    setCameraActive(false);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
  };

  const handleLoadSession = (item) => {
    setFileName(item.imageName || 'camera-image');
    setOcrText(item.ocrText || '');
    setAnalysis(item.analysis || null);
    setLesson(item.lesson || null);
  };

  const handleBookmark = async () => {
    if (!user?.uid) return;
    try {
      await saveCameraBookmark(user.uid, { text: ocrText, title: fileName || 'OCR session' });
      setBookmarks((prev) => [...prev, ocrText]);
    } catch (err) {
      setError(err.message || 'Unable to bookmark this text.');
    }
  };

  const startRename = (item) => {
    setRenameId(item.id);
    setRenameValue(item.imageName || 'OCR session');
  };

  const saveRename = async (id) => {
    if (!user?.uid) return;
    try {
      await renameCameraLearningRecord(user.uid, id, renameValue);
      setSavedSessions((prev) => prev.map((item) => (item.id === id ? { ...item, imageName: renameValue } : item)));
      setRenameId('');
    } catch (err) {
      setError(err.message || 'Unable to rename session.');
    }
  };

  const deleteSession = async (id) => {
    if (!user?.uid) return;
    try {
      await deleteCameraLearningRecord(user.uid, id);
      const fresh = await getUserCameraLearning(user.uid);
      setSavedSessions(fresh || []);
      if (lesson?.id === id) setLesson(null);
    } catch (err) {
      setError(err.message || 'Unable to delete session.');
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(ocrText);
    } catch (err) {
      setError('Clipboard access is unavailable.');
    }
  };

  const downloadNotes = () => {
    const blob = new Blob([ocrText || lesson?.summary || 'No notes available'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName || 'ocr-session'}-notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <CameraCapture
          onCapture={handleAnalyze}
          onUpload={handleUpload}
          onUseCamera={handleUseCamera}
          loading={loading}
          fileName={fileName}
          previewUrl={previewUrl}
          onReset={() => { setFile(null); setPreviewUrl(''); setFileName(''); setOcrText(''); setAnalysis(null); setLesson(null); setError(''); }}
        />

        {error ? <div className="rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div> : null}

        {cameraActive ? (
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl">
            <video ref={videoRef} className="w-full rounded-[1.5rem]" />
            <button onClick={handleCaptureFromCamera} className="mt-4 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Capture Image</button>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <OCRPreview ocrText={ocrText} onEditText={(event) => setOcrText(event.target.value)} onCopyText={copyText} onDownloadNotes={downloadNotes} />
            {loading ? <LoadingOCR /> : null}
            {analysis ? <ExtractedText sections={sections} concepts={analysis.keyConcepts || []} definitions={analysis.definitions || []} formulas={analysis.formulas || []} diagrams={analysis.diagrams || []} bookmarks={bookmarks} /> : null}
            {lesson ? <OCRSummary lesson={lesson} /> : null}
          </div>
          <div className="space-y-6">
            {lesson ? <LessonCards lesson={lesson} /> : null}
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Bookmarks</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Saved highlights</h3>
                </div>
                <button onClick={handleBookmark} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Bookmark Text</button>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                {bookmarks.length ? bookmarks.map((item, index) => <div key={`${item}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">{item}</div>) : <p className="text-slate-500">Bookmark extracted text to revisit it later.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Saved OCR Sessions</p>
              <h3 className="text-xl font-semibold text-white">Continue, rename, and delete sessions</h3>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {savedSessions.length === 0 ? <p className="text-sm text-slate-500">No OCR sessions saved yet.</p> : savedSessions.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  {renameId === item.id ? (
                    <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white" />
                  ) : (
                    <p className="font-medium text-white">{item.imageName || 'OCR session'}</p>
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
