import { useRef, useState } from 'react';
import { validateUploadFile } from '../utils/security';
import { UploadCloud, FileText, Mic, Sparkles, Loader, Link as LinkIcon, Youtube, Type } from 'lucide-react';
import { getDakshaImageResponse, getDakshaDocumentAnalysis, getDakshaLessonPackage } from '../services/aiService';
import { saveDocumentAnalysis, saveLessonPackage } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import LearningInterviewModal from '../components/common/LearningInterviewModal';

let pdfJsLoader;
const loadPdfJs = async () => {
  if (!pdfJsLoader) {
    pdfJsLoader = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min?url')
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }

  return pdfJsLoader;
};

let jsZipLoader;
const loadJSZip = async () => {
  if (!jsZipLoader) {
    jsZipLoader = import('jszip').then((module) => module.default);
  }

  return jsZipLoader;
};

let mammothLoader;
const loadMammoth = async () => {
  if (!mammothLoader) {
    mammothLoader = import('mammoth').then((module) => module.default);
  }

  return mammothLoader;
};

const tabs = ['Overview', 'Summary', 'Topics', 'Keywords', 'Quiz', 'Flashcards'];

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

  const extractPptxText = async (arrayBuffer) => {
    const JSZip = await loadJSZip();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slideEntries = [];
    zip.forEach((relativePath, fileEntry) => {
      if (/ppt\/slides\/slide\d+\.xml$/.test(relativePath)) {
        slideEntries.push({ path: relativePath, entry: fileEntry });
      }
    });
    slideEntries.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
    const textParts = [];
    for (const slide of slideEntries) {
      const content = await slide.entry.async('text');
      const matches = content.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g);
      for (const match of matches) {
        if (match[1]) {
          textParts.push(match[1]);
        }
      }
    }
    return textParts.join(' ');
  };

  const parseHtmlText = (htmlString) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      return doc.body.innerText.replace(/\s+/g, ' ').trim();
    } catch (error) {
      console.error('HTML parse error:', error);
      return htmlString;
    }
  };

  const parseCsvText = (csvString) => {
    return csvString.replace(/\r?\n/g, ' ').replace(/,+/g, ' ').replace(/\s+/g, ' ').trim();
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

  const handleDocumentAnalysis = async (text, file) => {
    const analysis = await getDakshaDocumentAnalysis(text.substring(0, 50000), file.name, file.type || file.name);
    setAnalysisResult(analysis);
    await saveAnalysisResult(analysis, file);
    const lessonPackageResult = await getDakshaLessonPackage(text.substring(0, 50000), 'document', file.name);
    setLessonPackage(lessonPackageResult);
    await saveLessonPackageResult(lessonPackageResult, file);
  };

  const processTextSource = async (text, sourceName, sourceType = 'text/plain') => {
    const normalized = String(text || '').trim();
    if (!normalized) return;
    setLoading(true);
    setActiveTab('Overview');
    setFilePreview(normalized.slice(0, 1200));
    setSaveStatus('');
    setLessonStatus('');
    try {
      await handleDocumentAnalysis(normalized, {
        name: sourceName,
        type: sourceType,
        size: normalized.length
      });
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
    startInterviewBeforeAnalysis(`I uploaded a website: ${url}`, url, async () => {
      await processTextSource(`Website source: ${url}`, url, 'text/url');
    });
  };

  const handleYoutubeSubmit = async () => {
    const url = youtubeUrl.trim();
    if (!url) return;
    startInterviewBeforeAnalysis(`I uploaded a YouTube lesson: ${url}`, url, async () => {
      await processTextSource(`YouTube source: ${url}`, url, 'text/youtube');
    });
  };

  const handleTextSubmit = async () => {
    startInterviewBeforeAnalysis('Teach me this pasted material', 'pasted-text.txt', async () => {
      await processTextSource(sourceText, 'pasted-text.txt', 'text/plain');
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
      startInterviewBeforeAnalysis('Teach me from my voice input', 'voice-input.txt', async () => {
        await processTextSource(transcript, 'voice-input.txt', 'text/voice');
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

  const processFile = async (file) => {
    setLoading(true);

    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result.split(',')[1];
          const aiResponse = await getDakshaImageResponse(base64data, file.type);
          const imageAnalysis = {
            overview: aiResponse,
            summary: aiResponse,
            topics: [],
            keywords: [],
            definitions: [],
            importantPoints: [],
            difficulty: 'Unknown',
            detectedElements: {
              headings: [],
              chapters: [],
              tables: 0,
              images: 1,
              diagrams: 0,
              formulas: [],
              codeBlocks: [],
              lists: []
            },
            quiz: [],
            flashcards: []
          };
          setAnalysisResult(imageAnalysis);
          setFilePreview('Image uploaded. Daksha AI analyzed the visual content and provided an overview.');
          await saveAnalysisResult(imageAnalysis, file);
          const lessonPackageResult = await getDakshaLessonPackage(aiResponse, 'image', file.name);
          setLessonPackage(lessonPackageResult);
          await saveLessonPackageResult(lessonPackageResult, file);
          setLoading(false);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const arrayBuffer = reader.result;
          const pdfjsLib = await loadPdfJs();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let textContent = '';
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map((item) => item.str).join(' ') + ' ';
          }
          setFilePreview(textContent.substring(0, 1200));
          await handleDocumentAnalysis(textContent, file);
          setLoading(false);
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const arrayBuffer = reader.result;
          const mammoth = await loadMammoth();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const textContent = result.value;
          setFilePreview(textContent.substring(0, 1200));
          await handleDocumentAnalysis(textContent, file);
          setLoading(false);
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || file.name.endsWith('.pptx')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const arrayBuffer = reader.result;
          const textContent = await extractPptxText(arrayBuffer);
          setFilePreview(textContent.substring(0, 1200));
          await handleDocumentAnalysis(textContent, file);
          setLoading(false);
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type === 'text/html' || file.name.endsWith('.html')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const htmlString = reader.result;
          const textContent = parseHtmlText(htmlString);
          setFilePreview(textContent.substring(0, 1200));
          await handleDocumentAnalysis(textContent, file);
          setLoading(false);
        };
        reader.readAsText(file);
      } else if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const textContent = reader.result;
          setFilePreview(textContent.substring(0, 1200));
          await handleDocumentAnalysis(textContent, file);
          setLoading(false);
        };
        reader.readAsText(file);
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const csvString = reader.result;
          const textContent = parseCsvText(csvString);
          setFilePreview(textContent.substring(0, 1200));
          await handleDocumentAnalysis(textContent, file);
          setLoading(false);
        };
        reader.readAsText(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const textContent = reader.result;
          setFilePreview(textContent.substring(0, 1200));
          await handleDocumentAnalysis(textContent, file);
          setLoading(false);
        };
        reader.readAsText(file);
      } else {
        setAnalysisResult(null);
        setFilePreview('Unsupported file type. Please upload PDF, DOCX, TXT, PPTX, MD, CSV, HTML, or an image.');
        setSaveStatus('Unsupported file type.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Scanner Error:', error);
      setAnalysisResult(null);
      setFilePreview('An error occurred while reading the file.');
      setSaveStatus('An error occurred while processing the file.');
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

      startInterviewBeforeAnalysis(`I uploaded ${file.name}`, file.name, async () => {
        await processFile(file);
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
          <p className="max-w-3xl text-sm text-slate-400 sm:text-base">Upload or paste anything. Daksha AI processes PDFs, DOCX, PPT, images, handwritten notes, website URLs, YouTube URLs, text, and voice through one learning pipeline.</p>
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
                <p className="text-sm text-slate-400 sm:text-base">PDF, DOCX, TXT, PPTX, MD, CSV, HTML, PNG, JPG</p>
              </div>
              <input type="file" accept="image/*,.pdf,.docx,.txt,.pptx,.md,.csv,.html" onChange={handleFileChange} className="hidden" />
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

        {lessonPackage && (
          <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/20">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Lesson Package</h2>
                <p className="text-slate-400">Automatically generated course content, quizzes, flashcards, cheat sheet, and roadmap.</p>
              </div>
              <span className="rounded-full bg-indigo-500/15 px-4 py-2 text-sm text-indigo-200">Premium Learning</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Complete Course</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.completeCourse || 'No course content generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Learning Roadmap</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.learningRoadmap || 'No roadmap generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Cheat Sheet</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.cheatSheet || 'No cheat sheet generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Mind Map</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.mindMap || 'No mind map generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Beginner</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.beginnerExplanation || 'No beginner explanation generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Intermediate</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.intermediateExplanation || 'No intermediate explanation generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Advanced</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.advancedExplanation || 'No advanced explanation generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Revision Notes</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.revisionNotes || 'No revision notes generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Real-world Examples</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.realWorldExamples || 'No examples generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Interview Questions</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.interviewQuestions || 'No interview questions generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Practice Questions</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.practiceQuestions || 'No practice questions generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Quiz</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.quiz || 'No quiz generated.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold mb-3">Flashcards</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lessonPackage.flashcards || 'No flashcards generated.'}</p>
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
        onComplete={async () => {
          setInterviewOpen(false);
          if (pendingActionRef.current) {
            const action = pendingActionRef.current;
            pendingActionRef.current = null;
            await action();
          }
        }}
      />
    </div>
  );
}
