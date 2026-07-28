import { useRef, useState } from 'react';
import { validateUploadFile } from '../utils/security';
import { UploadCloud, FileText, Mic, Loader, Link as LinkIcon, Youtube, Type } from 'lucide-react';
import { getDakshaImageResponse } from '../services/aiService';
import { runUniversalLearningPipeline, buildUniversalLearningArtifacts } from '../services/universalLearningPipeline';
import { saveDocumentAnalysis, saveLessonPackage, savePersonalizedLearningPlan, saveMemoryBrain, saveProgressSnapshot } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import LearningInterviewModal from '../components/common/LearningInterviewModal';
import PersonalizedLearningDashboard from '../components/common/PersonalizedLearningDashboard';
import { buildPersonalizedLearningPlan } from '../utils/personalizedLearningEngine';
import { persistLearningSession } from '../services/learningSessionOrchestrator';
import { deriveLearningTitle, buildFallbackLessonPackage } from '../utils/learningContentUtils';

const tabs = ['Overview', 'Summary', 'Topics', 'Keywords', 'Quiz', 'Flashcards'];

const detectSourceHintFromFile = (file = null) => {
  const name = (file?.name || '').toLowerCase();
  if (file?.type?.startsWith('image/')) return 'image';
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (/\.docx$/i.test(name)) return 'docx';
  if (/\.pptx?$/i.test(name)) return 'pptx';
  if (/\.md$/i.test(name)) return 'markdown';
  if (/\.html?$/i.test(name)) return 'html';
  if (/\.txt$/i.test(name)) return 'txt';
  if (/\.csv$/i.test(name)) return 'txt';
  if (/\.epub$/i.test(name)) return 'epub';
  if (/\.mp3|\.wav|\.m4a$/i.test(name)) return 'audio';
  if (/\.mp4|\.mov|\.avi|\.mkv$/i.test(name)) return 'video';
  if (file?.type?.startsWith('audio/')) return 'audio';
  if (file?.type?.startsWith('video/')) return 'video';
  return 'document';
};

export default function Scanner() {
  const [files, setFiles] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [lessonPackage, setLessonPackage] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [lessonStatus, setLessonStatus] = useState('');
  const [learningPlan, setLearningPlan] = useState(null);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewSeedTopic, setInterviewSeedTopic] = useState('');
  const [interviewSourceLabel, setInterviewSourceLabel] = useState('');
  const pendingActionRef = useRef(null);
  const { user } = useAuth();

  const startInterviewBeforeAnalysis = (seedTopic, sourceLabel, action) => {
    pendingActionRef.current = action;
    setInterviewSeedTopic(seedTopic);
    setInterviewSourceLabel(sourceLabel || seedTopic);
    setInterviewOpen(true);
  };

  const saveAnalysisResult = async (result, file) => {
    if (!user) {
      setSaveStatus('Sign in to save extracted knowledge to Firebase.');
      return;
    }

    try {
      setSaveStatus('Saving extracted knowledge...');
      await saveDocumentAnalysis(user.uid, {
        fileName: file.name,
        fileType: file.type || file.name.split('.').pop(),
        fileSize: file.size
      }, result);
      setSaveStatus('Extracted knowledge saved to Firebase.');
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('Unable to save extracted knowledge.');
    }
  };

  const saveLessonPackageResult = async (packageData, file) => {
    if (!user) {
      setLessonStatus('Sign in to save lesson packages to Firebase.');
      return;
    }

    try {
      setLessonStatus('Saving lesson package...');
      await saveLessonPackage(user.uid, {
        sourceName: file.name,
        sourceType: file.type || file.name.split('.').pop(),
        sourceText: packageData.completeCourse?.substring(0, 2000) || ''
      }, packageData);
      setLessonStatus('Lesson package saved to Firebase.');
    } catch (error) {
      console.error('Lesson save error:', error);
      setLessonStatus('Unable to save lesson package.');
    }
  };

  const handleDocumentAnalysis = async (descriptor = {}, interviewAnswers = {}, sourceContext = 'document') => {
    const {
      file = null,
      text = '',
      url = '',
      sourceName = file?.name || url || 'universal-source',
      sourceHint = sourceContext,
      sourceType = file?.type || 'text/plain'
    } = descriptor;

    const result = await runUniversalLearningPipeline({
      file,
      url,
      text,
      sourceHint,
      sourceName
    });
    const suite = buildUniversalLearningArtifacts(result);
    const intelligenceProfile = result.intelligenceProfile || result.sourceMeta?.intelligenceProfile || null;

    const derivedTitle = deriveLearningTitle(sourceName, sourceContext === 'document' ? 'Adaptive lesson' : sourceName);
    const fallbackSuite = buildFallbackLessonPackage({ title: derivedTitle, summary: suite.learningSession?.summary || result.sourceModel?.overview || '' });
    const safeSuite = {
      ...suite,
      completeCourse: suite.completeCourse || fallbackSuite.completeCourse,
      beginnerExplanation: suite.beginnerExplanation || fallbackSuite.beginnerExplanation,
      intermediateExplanation: suite.intermediateExplanation || fallbackSuite.intermediateExplanation,
      advancedExplanation: suite.advancedExplanation || fallbackSuite.advancedExplanation,
      learningRoadmap: suite.learningRoadmap?.length ? suite.learningRoadmap : fallbackSuite.learningRoadmap,
      cheatSheet: suite.cheatSheet || fallbackSuite.cheatSheet,
      mindMap: suite.mindMap || fallbackSuite.mindMap,
      revisionNotes: suite.revisionNotes || fallbackSuite.revisionNotes,
      realWorldExamples: suite.realWorldExamples?.length ? suite.realWorldExamples : fallbackSuite.realWorldExamples,
      interviewQuestions: suite.interviewQuestions?.length ? suite.interviewQuestions : fallbackSuite.interviewQuestions,
      practiceQuestions: suite.practiceQuestions?.length ? suite.practiceQuestions : fallbackSuite.practiceQuestions,
      quiz: suite.quiz?.length ? suite.quiz : fallbackSuite.quiz,
      flashcards: suite.flashcards?.length ? suite.flashcards : fallbackSuite.flashcards
    };

    const analysis = {
      overview: safeSuite.learningSession?.summary || result.sourceModel?.overview || '',
      summary: safeSuite.learningSession?.summary || '',
      topics: suite.learningSession?.keyConcepts || [],
      keywords: suite.learningSession?.keyConcepts || [],
      definitions: suite.learningSession?.importantDefinitions || [],
      importantPoints: suite.learningSession?.keyConcepts || [],
      difficulty: result.sourceMeta?.difficulty || 'Medium',
      detectedElements: {
        headings: result.sourceModel?.headings || [],
        chapters: result.sourceModel?.chapters || [],
        tables: result.sourceModel?.tables?.length || 0,
        images: (result.sourceModel?.images?.length || 0) + (result.sourceMeta?.detectImages ? 1 : 0),
        diagrams: result.sourceModel?.diagrams?.length || 0,
        formulas: result.sourceModel?.formulas || [],
        codeBlocks: result.sourceModel?.codeBlocks || [],
        lists: suite.learningSession?.keyConcepts || []
      },
      quiz: suite.quiz,
      flashcards: suite.flashcards
    };

    if (intelligenceProfile?.followUpPrompt && !result.sourceModel?.extractedText) {
      setSaveStatus(intelligenceProfile.followUpPrompt);
      setLessonStatus(intelligenceProfile.followUpPrompt);
    }

    setAnalysisResult(analysis);
    setLessonPackage(safeSuite);
    setFilePreview((result.sourceModel?.extractedText || result.sourceModel?.overview || '').slice(0, 1200));
    await saveAnalysisResult(analysis, file || { name: sourceName, type: sourceType, size: String(text || '').length });
    await saveLessonPackageResult(safeSuite, file || { name: sourceName, type: sourceType, size: String(text || '').length });

    const plan = buildPersonalizedLearningPlan({
      interviewAnswers: {
        ...(interviewAnswers || {}),
        learnTopic: interviewAnswers?.learnTopic || sourceName
      },
      sourceContext,
      sourceLabel: sourceName,
      sourceSummary: String(text || '').slice(0, 600),
      skillHint: sourceName
    });
    setLearningPlan(plan);
    if (user) {
      await persistLearningSession({
        user,
        sourceLabel: sourceName,
        sourceContext,
        sessionData: {
          title: sourceName,
          topic: sourceName,
          summary: suite.learningSession?.summary || '',
          difficulty: result.sourceMeta?.difficulty || 'Medium',
          sourceMeta: result.sourceMeta,
          learningSession: suite.learningSession,
          lessonSuite: safeSuite,
          plan,
          memory: suite.memoryEntry,
          progress: suite.progressEntry,
          assessment: { questionCount: 6 },
          interview: interviewAnswers || {},
          teacher: suite.aiTeacher,
          roadmap: { topic: sourceName, plan },
          graph: suite.knowledgeGraph
        },
        assessmentContext: { questionCount: 6 },
        planContext: {
          topic: sourceName,
          interviewAnswers: interviewAnswers || {},
          focus: sourceContext,
          strengths: ['foundational concepts'],
          weaknesses: ['key gaps'],
          learningStyle: 'guided',
          goal: 'skill growth'
        }
      });
    }

    const finalStatus = intelligenceProfile?.followUpPrompt
      ? intelligenceProfile.followUpPrompt
      : 'Universal scanner completed.';
    setSaveStatus(finalStatus);
    setLessonStatus(intelligenceProfile?.followUpPrompt ? 'Need more context to finish the lesson map. Retry AI or ask the learner for details.' : 'Learning suite generated.');
  };

  const processTextSource = async (text, sourceName, sourceType = 'text/plain', interviewAnswers = {}, sourceContext = 'text') => {
    const normalized = String(text || '').trim();
    if (!normalized) return;
    setLoading(true);
    setActiveTab('Overview');
    setFilePreview(normalized.slice(0, 1200));
    setSaveStatus('');
    setLessonStatus('');
    try {
      await handleDocumentAnalysis({
        text: normalized,
        sourceName,
        sourceHint: sourceContext,
        sourceType,
        file: {
          name: sourceName,
          type: sourceType,
          size: normalized.length
        }
      }, interviewAnswers, sourceContext);
    } catch (error) {
      console.error('Universal source analysis error:', error);
      setSaveStatus('An error occurred while processing this source.');
    } finally {
      setLoading(false);
    }
  };

  const handleWebsiteSubmit = async () => {
    const url = websiteUrl.trim();
    if (!url) return;
    startInterviewBeforeAnalysis(`I uploaded a website: ${url}`, url, async (interviewAnswers) => {
      await handleDocumentAnalysis({
        url,
        sourceName: url,
        sourceHint: 'website',
        sourceType: 'text/url'
      }, interviewAnswers, 'website');
    });
  };

  const handleYoutubeSubmit = async () => {
    const url = youtubeUrl.trim();
    if (!url) return;
    startInterviewBeforeAnalysis(`I uploaded a YouTube lesson: ${url}`, url, async (interviewAnswers) => {
      await handleDocumentAnalysis({
        url,
        sourceName: url,
        sourceHint: 'youtube',
        sourceType: 'text/youtube'
      }, interviewAnswers, 'youtube');
    });
  };

  const handleTextSubmit = async () => {
    startInterviewBeforeAnalysis('Teach me this pasted material', 'pasted-text.txt', async (interviewAnswers) => {
      await processTextSource(sourceText, 'pasted-text.txt', 'text/plain', interviewAnswers, 'text');
    });
  };

  const handleVoiceInput = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSaveStatus('Voice input is not supported on this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setVoiceListening(true);
    recognition.onresult = async (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setSourceText(transcript);
      startInterviewBeforeAnalysis('Teach me from my voice input', 'voice-input.txt', async (interviewAnswers) => {
        await processTextSource(transcript, 'voice-input.txt', 'text/voice', interviewAnswers, 'voice');
      });
      setVoiceListening(false);
    };

    recognition.onerror = () => {
      setVoiceListening(false);
      setSaveStatus('Voice capture failed. Please try again.');
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognition.start();
  };

  const processFile = async (file, interviewAnswers = {}) => {
    setLoading(true);

    try {
      const sourceHint = detectSourceHintFromFile(file);
      let descriptor = {
        file,
        sourceName: file.name,
        sourceHint,
        sourceType: file.type || file.name,
        sourceContext: sourceHint
      };

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const base64data = dataUrl.split(',')[1];
        const aiResponse = await getDakshaImageResponse(base64data, file.type);
        descriptor = {
          ...descriptor,
          text: aiResponse,
          sourceHint: 'image',
          sourceContext: 'image'
        };
      }

      if (!descriptor.text && sourceHint !== 'image') {
        descriptor = {
          ...descriptor,
          text: '',
          sourceHint,
          sourceContext: sourceHint
        };
      }

      await handleDocumentAnalysis(descriptor, interviewAnswers, descriptor.sourceContext);
    } catch (error) {
      console.error('Scanner Error:', error);
      setAnalysisResult(null);
      setFilePreview('An error occurred while reading the file.');
      setSaveStatus('An error occurred while processing the file.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const uploadCheck = validateUploadFile(file);
      if (!uploadCheck.valid) {
        setAnalysisResult(null);
        setFilePreview(uploadCheck.reason);
        setSaveStatus(uploadCheck.reason);
        return;
      }

      setFiles([file]);
      setActiveTab('Overview');
      setAnalysisResult(null);
      setFilePreview('');
      setSaveStatus('');
      setLessonStatus('');

      startInterviewBeforeAnalysis(`I uploaded ${file.name}`, file.name, async (interviewAnswers) => {
        await processFile(file, interviewAnswers);
      });
    }
  };

  const renderList = (items, fallbackMessage = 'No items found yet.', renderItem) => {
    if (!items || items.length === 0) {
      return <p className="text-slate-400">{fallbackMessage}</p>;
    }

    return (
      <div className="grid gap-4">
        {items.map((item, index) => (
          <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            {renderItem ? renderItem(item, index) : <p className="text-slate-200">{typeof item === 'string' ? item : JSON.stringify(item)}</p>}
          </div>
        ))}
      </div>
    );
  };

  const currentAnalysis = analysisResult;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Universal Learning</h1>
          <p className="max-w-3xl text-sm text-slate-400 sm:text-base">Upload or paste anything. Daksha AI processes PDFs, DOCX, PPT, images, handwritten notes, books, research papers, camera captures, audio, video, websites, YouTube URLs, GitHub repos, Google Docs, OneDrive, Dropbox, and text through one universal learning pipeline.</p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-200"><Type className="h-4 w-4 text-indigo-400" /> Paste Text</div>
            <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="Paste notes, book text, or lesson content..." className="min-h-28 w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 outline-none" />
            <button onClick={handleTextSubmit} disabled={loading || !sourceText.trim()} className="mt-3 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Start AI Interview</button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-200"><LinkIcon className="h-4 w-4 text-cyan-400" /> Website URL</div>
            <input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com/article" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none" />
            <div className="mt-4 mb-2 flex items-center gap-2 text-slate-200"><Youtube className="h-4 w-4 text-rose-400" /> YouTube URL</div>
            <input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={handleWebsiteSubmit} disabled={loading || !websiteUrl.trim()} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Interview + Website</button>
              <button onClick={handleYoutubeSubmit} disabled={loading || !youtubeUrl.trim()} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Interview + YouTube</button>
              <button onClick={handleVoiceInput} disabled={loading || voiceListening} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 disabled:opacity-60"><Mic className="h-4 w-4" /> {voiceListening ? 'Listening...' : 'Voice Interview'}</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.95fr] lg:gap-8">
          <div className="space-y-6">
            <label className="flex min-h-[18rem] w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-700 bg-slate-900 p-4 transition-colors hover:border-indigo-500 sm:min-h-[20rem] sm:p-6">
              <div className="flex flex-col items-center justify-center pt-10 pb-10 px-6 text-center">
                <UploadCloud className="w-14 h-14 text-indigo-500 mb-4" />
                <p className="mb-2 text-lg font-semibold text-white">Upload a file</p>
                <p className="text-sm text-slate-400 sm:text-base">PDF, DOCX, PPT, TXT, MD, CSV, HTML, EPUB, images, audio, video, ZIP, books, research papers, handwritten notes</p>
              </div>
              <input type="file" accept="image/*,.pdf,.docx,.ppt,.pptx,.txt,.md,.csv,.html,.epub,.zip,.mp3,.wav,.m4a,.mp4,.mov,.avi,.mkv,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
            </label>

            <label className="flex min-h-[8rem] w-full cursor-pointer flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-cyan-500">
              <div className="flex flex-col items-center justify-center text-center">
                <Mic className="mb-2 h-8 w-8 text-cyan-400" />
                <p className="text-sm text-slate-200">Camera Scan (mobile)</p>
                <p className="text-xs text-slate-400">Capture handwritten notes or book pages directly</p>
              </div>
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </label>

            {files.length > 0 && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-slate-950/20 sm:p-6">
                <h2 className="mb-4 text-xl font-semibold sm:text-2xl">Current Upload</h2>
                {files.map((file, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-4">
                      <FileText className="w-10 h-10 text-indigo-500" />
                      <div>
                        <p className="font-semibold">{file.name}</p>
                        <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(2)} KB • {file.type || file.name.split('.').pop()}</p>
                      </div>
                    </div>
                    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-4">
                      <p className="text-slate-400 text-sm">Preview</p>
                      <p className="mt-3 text-slate-200 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{filePreview || 'Waiting for upload...'}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-slate-300">{loading ? 'Processing…' : 'Ready'}</span>
                      <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-slate-300">{saveStatus || 'Sign in to save results to Firebase.'}</span>
                      <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-slate-300">{lessonStatus || 'Sign in to save lesson packages.'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-slate-950/20 sm:p-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Document Intelligence</h2>
                  <p className="text-slate-400">Analyze the content and explore structured insights with premium tabs.</p>
                </div>
                {loading && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-slate-200">
                    <Loader className="w-4 h-4 animate-spin" /> Processing document
                  </div>
                )}
              </div>

              <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeTab === tab ? 'bg-indigo-500 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {currentAnalysis ? (
                <div className="space-y-6">
                  {activeTab === 'Overview' && (
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                        <h3 className="text-xl font-semibold mb-3">Overview</h3>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{currentAnalysis.overview || 'No overview available.'}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                          <h4 className="text-sm uppercase tracking-[0.2em] text-slate-400">Difficulty</h4>
                          <p className="mt-3 text-xl font-semibold text-white">{currentAnalysis.difficulty || 'Unknown'}</p>
                        </div>
                        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                          <h4 className="text-sm uppercase tracking-[0.2em] text-slate-400">Detected Elements</h4>
                          <div className="mt-3 grid gap-2 text-slate-300 text-sm">
                            <div className="flex justify-between"><span>Headings</span><span>{currentAnalysis.detectedElements?.headings?.length ?? 0}</span></div>
                            <div className="flex justify-between"><span>Chapters</span><span>{currentAnalysis.detectedElements?.chapters?.length ?? 0}</span></div>
                            <div className="flex justify-between"><span>Tables</span><span>{currentAnalysis.detectedElements?.tables ?? 0}</span></div>
                            <div className="flex justify-between"><span>Images</span><span>{currentAnalysis.detectedElements?.images ?? 0}</span></div>
                            <div className="flex justify-between"><span>Diagrams</span><span>{currentAnalysis.detectedElements?.diagrams ?? 0}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'Summary' && (
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                        <h3 className="text-xl font-semibold mb-3">Summary</h3>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{currentAnalysis.summary || 'No summary available.'}</p>
                      </div>
                      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                        <h3 className="text-xl font-semibold mb-3">Important Points</h3>
                        {renderList(currentAnalysis.importantPoints, 'No important points detected.', (item) => <p>{typeof item === 'string' ? item : JSON.stringify(item)}</p>)}
                      </div>
                    </div>
                  )}

                  {activeTab === 'Topics' && (
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                      <h3 className="text-xl font-semibold mb-3">Topics</h3>
                      {renderList(currentAnalysis.topics, 'No topics identified.', (item) => <p>{typeof item === 'string' ? item : JSON.stringify(item)}</p>)}
                    </div>
                  )}

                  {activeTab === 'Keywords' && (
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                        <h3 className="text-xl font-semibold mb-3">Keywords</h3>
                        {renderList(currentAnalysis.keywords, 'No keywords found.', (item) => {
                          if (typeof item === 'string') return <p>{item}</p>;
                          const label = item.term || item.keyword || item.name || item[0] || JSON.stringify(item);
                          const detail = item.definition || item.description || item.value || item[1] || '';
                          return (
                            <div>
                              <p className="font-semibold text-white">{label}</p>
                              {detail && <p className="text-slate-400 mt-1">{detail}</p>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                        <h3 className="text-xl font-semibold mb-3">Definitions</h3>
                        {renderList(currentAnalysis.definitions, 'No definitions extracted.', (item) => {
                          if (typeof item === 'string') return <p>{item}</p>;
                          const term = item.term || item.word || item.name || item[0] || JSON.stringify(item);
                          const definition = item.definition || item.meaning || item.explanation || item[1] || '';
                          return (
                            <div>
                              <p className="font-semibold text-white">{term}</p>
                              {definition && <p className="text-slate-400 mt-1">{definition}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'Quiz' && (
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                      <h3 className="text-xl font-semibold mb-3">Quiz</h3>
                      {renderList(currentAnalysis.quiz, 'No quiz questions generated.', (item) => {
                        if (typeof item === 'string') {
                          return <p>{item}</p>;
                        }
                        const question = item.question || item.q || item.prompt || item[0] || '';
                        const answer = item.answer || item.a || item.response || item[1] || '';
                        return (
                          <div>
                            {question && <p className="font-semibold text-white">Q: {question}</p>}
                            {answer && <p className="text-slate-400 mt-2">A: {answer}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeTab === 'Flashcards' && (
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                      <h3 className="text-xl font-semibold mb-3">Flashcards</h3>
                      {renderList(currentAnalysis.flashcards, 'No flashcards generated.', (item) => {
                        if (typeof item === 'string') {
                          return <p>{item}</p>;
                        }
                        const front = item.front || item.term || item.question || item[0] || '';
                        const back = item.back || item.definition || item.answer || item[1] || '';
                        return (
                          <div>
                            {front && <p className="font-semibold text-white">{front}</p>}
                            {back && <p className="text-slate-400 mt-2">{back}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950 p-8 text-slate-400 text-center">
                  <p>Select a file to analyze and Daksha will generate structured document intelligence in the tabs above.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {learningPlan && (
          <div className="mt-10">
            <PersonalizedLearningDashboard
              plan={learningPlan}
              onResume={() => {
                setLessonStatus('Resume your personalized journey from upcoming lessons.');
              }}
            />
          </div>
        )}

        {lessonPackage && (
          <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/20">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Adaptive Learning Suite</h2>
                <p className="text-slate-400">Generated course content, quizzes, flashcards, cheat sheet, and roadmap with recovery options when AI output is incomplete.</p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200">Retry AI</span>
                <span className="rounded-full bg-cyan-500/15 px-4 py-2 text-sm text-cyan-200">Fallback AI</span>
                <span className="rounded-full bg-indigo-500/15 px-4 py-2 text-sm text-indigo-200">Vision AI</span>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Complete Course</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.completeCourse || 'The learning summary is being assembled from the uploaded material. You can retry AI or ask the learner for more context.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Learning Roadmap</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{Array.isArray(lessonPackage.learningRoadmap) ? lessonPackage.learningRoadmap.join('\n') : lessonPackage.learningRoadmap || 'The roadmap is being assembled from the available concepts. Retry AI or generate a partial lesson if the content is limited.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Cheat Sheet</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.cheatSheet || 'The study sheet will appear as soon as the key ideas are extracted. You can continue with a partial lesson while AI finishes the rest.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Mind Map</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.mindMap || 'A concept map will be generated from the extracted ideas once the main concepts are identified.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Beginner</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.beginnerExplanation || 'A beginner-friendly explanation will be created from the uploaded content. Choose Retry AI or Fallback AI if you need an immediate version.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Intermediate</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.intermediateExplanation || 'The intermediate layer is being prepared. The lesson can still be used with the partial content while the full explanation completes.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Advanced</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.advancedExplanation || 'The advanced explanation will appear after the key concepts are structured. Partial delivery remains available right away.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Revision Notes</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.revisionNotes || 'Revision notes are being prepared from the extracted concepts. Continue with the partial lesson and revisit later.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Real-world Examples</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{Array.isArray(lessonPackage.realWorldExamples) ? lessonPackage.realWorldExamples.join('\n') : lessonPackage.realWorldExamples || 'Practical examples will be added as soon as the key concepts are available.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Interview Questions</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{Array.isArray(lessonPackage.interviewQuestions) ? lessonPackage.interviewQuestions.join('\n') : lessonPackage.interviewQuestions || 'Interview-ready questions will be generated from the lesson structure once the content is sufficient.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Practice Questions</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{Array.isArray(lessonPackage.practiceQuestions) ? lessonPackage.practiceQuestions.join('\n') : lessonPackage.practiceQuestions || 'Practice prompts will be generated once the lesson outline is ready.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Quiz</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{Array.isArray(lessonPackage.quiz) ? lessonPackage.quiz.map((item) => item.question || item).join('\n') : lessonPackage.quiz || 'A quiz will be generated after the lesson content is structured.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Flashcards</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{Array.isArray(lessonPackage.flashcards) ? lessonPackage.flashcards.map((item) => `${item.front || ''}: ${item.back || ''}`).filter(Boolean).join('\n') : lessonPackage.flashcards || 'Flashcards will be generated after the core concepts are identified.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <LearningInterviewModal
        isOpen={interviewOpen}
        userId={user?.uid}
        sourceContext="material"
        sourceLabel={interviewSourceLabel}
        initialTopic={interviewSeedTopic}
        onClose={() => setInterviewOpen(false)}
        onComplete={async (interviewAnswers) => {
          setInterviewOpen(false);
          if (pendingActionRef.current) {
            const action = pendingActionRef.current;
            pendingActionRef.current = null;
            await action(interviewAnswers);
          }
        }}
      />
    </div>
  );
}
