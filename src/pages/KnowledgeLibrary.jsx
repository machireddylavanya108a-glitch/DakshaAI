import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  Clock,
  Eye,
  Filter,
  Languages,
  Mic,
  Plus,
  Search,
  Sparkles,
  Star,
  Upload,
  Image,
  Trash2,
  PlayCircle,
  FolderPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loadKnowledgeLibrary, upsertKnowledgeItem, deleteKnowledgeItem } from '../services/knowledgeLibraryService';
import {
  applyKnowledgeFilters,
  buildDefaultKnowledgeItem,
  buildRecommendations,
  getLibraryMetrics,
  normalizeKnowledgeItem
} from '../utils/knowledgeLibraryUtils';

const SEARCH_MODES = ['All', 'My Library', 'Web knowledge', 'Documents', 'Research', 'Code', 'Courses'];
const NAV_TABS = ['All', 'Courses', 'Documents', 'Books', 'Research', 'Saved', 'Recent'];
const DETAIL_TABS = ['Overview', 'Lessons', 'Notes', 'Timeline'];

const CATEGORY_OPTIONS = ['All', 'AI', 'Science', 'Business', 'Medicine', 'Technology', 'History', 'Arts', 'Education', 'Personal development', 'Other'];
const SOURCE_OPTIONS = ['All', 'course', 'document', 'book', 'research', 'code', 'website', 'pdf', 'docx', 'markdown'];
const DIFFICULTY_OPTIONS = ['All', 'Beginner', 'Easy', 'Medium', 'Hard', 'Expert'];
const LANGUAGE_OPTIONS = ['All', 'English', 'Hindi', 'Telugu', 'Spanish', 'French', 'German', 'Chinese'];
const DATE_OPTIONS = ['Any time', 'Last 7 days', 'Last 30 days', 'Last 90 days'];
const COMPLETION_OPTIONS = ['All', 'Not started', 'In progress', 'Completed'];

function formatDate(value) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) return 'Not opened yet';
  return new Date(timestamp).toLocaleDateString();
}

function normalizeSourceLabel(value = '') {
  const normalized = String(value || '').trim();
  if (!normalized) return 'unknown';
  return normalized.replace(/-/g, ' ');
}

function deriveItemLessons(item) {
  if (Array.isArray(item.lessons) && item.lessons.length) return item.lessons;
  return (item.topics || []).slice(0, 5).map((topic, index) => ({
    id: `${item.id}-lesson-${index + 1}`,
    title: topic,
    status: index === 0 ? 'Next' : 'Planned'
  }));
}

function deriveInterviewQuestions(item) {
  const topic = item.title || 'this topic';
  return [
    `What are the core ideas behind ${topic}?`,
    `Where can ${topic} be applied in real projects?`,
    `How would you explain ${topic} to a beginner?`
  ];
}

function deriveQuickQuiz(item) {
  const topic = item.title || 'this topic';
  return [
    `Define ${topic} in one paragraph.`,
    `List 3 practical use-cases for ${topic}.`,
    `What concept should be learned before ${topic}?`
  ];
}

function buildFallbackFlashcards(item) {
  const firstTag = item.tags?.[0] || 'Core concept';
  return [
    { front: item.title || 'Topic', back: item.summary || 'Summary not available yet.' },
    { front: 'Category', back: item.category || 'Other' },
    { front: 'Key tag', back: firstTag }
  ];
}

export default function KnowledgeLibrary() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchMode, setSearchMode] = useState('All');
  const [activeTab, setActiveTab] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState('Overview');
  const [isListening, setIsListening] = useState(false);
  const [filters, setFilters] = useState({
    category: 'All',
    sourceType: 'All',
    difficulty: 'All',
    language: 'All',
    dateAdded: 'Any time',
    completionStatus: 'All',
    favorites: false
  });

  const voiceSearchSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const response = await loadKnowledgeLibrary(user?.uid || '');
      if (!active) return;

      const loadedItems = (response?.items || []).map(normalizeKnowledgeItem);
      setItems(loadedItems);
      setOffline(Boolean(response?.offline));
      setStatus(response?.offline ? 'Offline cache active' : 'Synced');
      if (loadedItems[0]) {
        setSelectedId((current) => current || loadedItems[0].id);
      }
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const filteredItems = useMemo(() => applyKnowledgeFilters(items, {
    query: debouncedQuery,
    mode: searchMode,
    tab: activeTab,
    filters
  }), [items, debouncedQuery, searchMode, activeTab, filters]);

  const metrics = useMemo(() => getLibraryMetrics(items), [items]);
  const selectedItem = useMemo(() => {
    const found = items.find((item) => item.id === selectedId);
    return found || filteredItems[0] || items[0] || null;
  }, [items, filteredItems, selectedId]);
  const recommendations = useMemo(() => buildRecommendations(items, selectedItem), [items, selectedItem]);
  const collections = useMemo(() => {
    const names = new Set(items.map((item) => item.collection).filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [items]);
  const bookmarkedItems = useMemo(() => items.filter((item) => item.bookmarked || item.favorite), [items]);
  const recentItems = useMemo(() => {
    return [...items]
      .sort((a, b) => Date.parse(String(b.lastOpenedAt || 0)) - Date.parse(String(a.lastOpenedAt || 0)))
      .slice(0, 6);
  }, [items]);

  const mutateItem = async (itemId, patch) => {
    const target = items.find((entry) => entry.id === itemId);
    if (!target) return;

    const updated = normalizeKnowledgeItem({
      ...target,
      ...patch,
      updatedAt: new Date().toISOString()
    });

    const result = await upsertKnowledgeItem(user?.uid || '', updated);
    setItems(result.items || []);
    setOffline(!result.synced && Boolean(user?.uid));
    setStatus(result.synced ? 'Saved' : 'Saved locally');
  };

  const handleOpenItem = async (item) => {
    setSelectedId(item.id);
    setWorkspaceTab('Overview');
    await mutateItem(item.id, { lastOpenedAt: new Date().toISOString() });
  };

  const handleContinueLearning = async (item) => {
    const nextProgress = Math.min(100, Number(item.progress || 0) + 10);
    const nextStatus = nextProgress >= 100 ? 'Completed' : 'In progress';
    await mutateItem(item.id, { progress: nextProgress, completionStatus: nextStatus, lastOpenedAt: new Date().toISOString() });
  };

  const handleDelete = async (itemId) => {
    const result = await deleteKnowledgeItem(user?.uid || '', itemId);
    setItems(result.items || []);
    setStatus(result.synced ? 'Deleted' : 'Deleted locally');
    if (selectedId === itemId) {
      const next = (result.items || [])[0];
      setSelectedId(next?.id || '');
    }
  };

  const handleCreateItem = async () => {
    const draft = buildDefaultKnowledgeItem();
    const result = await upsertKnowledgeItem(user?.uid || '', draft);
    setItems(result.items || []);
    setSelectedId(draft.id);
    setStatus(result.synced ? 'New item created' : 'New local item created');
  };

  const startVoiceSearch = () => {
    if (!voiceSearchSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setSearchInput(transcript);
      setStatus('Voice query captured');
      setIsListening(false);
    };
    recognition.onerror = () => {
      setStatus('Voice search failed. Try typing your query.');
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
          <p className="text-sm text-slate-400">Loading Universal Knowledge Library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(12,74,110,0.18),_transparent_36%),linear-gradient(160deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/35">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">Universal Knowledge Library</h1>
              <p className="mt-2 text-sm text-slate-400 sm:text-base">Discover, save, connect and understand everything you learn.</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">{status}</div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm"><span className="text-slate-400">Total items</span><p className="mt-1 text-lg font-semibold text-white">{metrics.totalItems}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm"><span className="text-slate-400">Saved items</span><p className="mt-1 text-lg font-semibold text-white">{metrics.savedItems}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm"><span className="text-slate-400">Active courses</span><p className="mt-1 text-lg font-semibold text-white">{metrics.activeCourses}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm"><span className="text-slate-400">Bookmarks</span><p className="mt-1 text-lg font-semibold text-white">{metrics.bookmarks}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm"><span className="text-slate-400">Recently viewed</span><p className="mt-1 text-lg font-semibold text-white">{metrics.recentlyViewed}</p></div>
          </div>
          {offline ? <p className="mt-3 text-xs text-amber-300">Network sync unavailable. Changes are stored locally and will sync later.</p> : null}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none"
                placeholder="Search topics, books, documents, research, code, courses or saved lessons..."
              />
              <button onClick={() => setShowFilters((current) => !current)} className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-2 py-1 text-xs text-slate-200"><Filter className="h-3.5 w-3.5" /> Advanced</button>
            </div>

            <div className="flex flex-wrap gap-2">
              {SEARCH_MODES.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSearchMode(mode)}
                  className={`rounded-xl px-3 py-1.5 text-xs ${searchMode === mode ? 'bg-cyan-500/20 text-cyan-100' : 'border border-slate-700 text-slate-300'}`}
                >
                  {mode}
                </button>
              ))}
              <button onClick={startVoiceSearch} disabled={!voiceSearchSupported || isListening} className={`rounded-xl px-3 py-1.5 text-xs ${voiceSearchSupported ? 'border border-slate-700 text-slate-200' : 'border border-slate-800 text-slate-500'}`}>
                <Mic className="mr-1 inline h-3.5 w-3.5" /> {isListening ? 'Listening...' : (voiceSearchSupported ? 'Voice' : 'Voice (Coming soon)')}
              </button>
              <button disabled className="rounded-xl border border-slate-800 px-3 py-1.5 text-xs text-slate-500"><Image className="mr-1 inline h-3.5 w-3.5" /> Image (Coming soon)</button>
              <button disabled className="rounded-xl border border-slate-800 px-3 py-1.5 text-xs text-slate-500"><Upload className="mr-1 inline h-3.5 w-3.5" /> Upload (Coming soon)</button>
            </div>

            {showFilters ? (
              <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
                <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200">{CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                <select value={filters.sourceType} onChange={(event) => setFilters((current) => ({ ...current, sourceType: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200">{SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                <select value={filters.difficulty} onChange={(event) => setFilters((current) => ({ ...current, difficulty: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200">{DIFFICULTY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                <select value={filters.language} onChange={(event) => setFilters((current) => ({ ...current, language: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200">{LANGUAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                <select value={filters.dateAdded} onChange={(event) => setFilters((current) => ({ ...current, dateAdded: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200">{DATE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                <select value={filters.completionStatus} onChange={(event) => setFilters((current) => ({ ...current, completionStatus: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200">{COMPLETION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-2 py-1 text-xs text-slate-300"><input type="checkbox" checked={filters.favorites} onChange={(event) => setFilters((current) => ({ ...current, favorites: event.target.checked }))} /> Favorites</label>
              </div>
            ) : null}
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-800 bg-slate-900/70 p-3">
          {NAV_TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-3 py-1.5 text-xs ${activeTab === tab ? 'bg-emerald-500/20 text-emerald-100' : 'border border-slate-700 text-slate-300'}`}>{tab}</button>
          ))}
          <button onClick={handleCreateItem} className="ml-auto inline-flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-200"><Plus className="h-3.5 w-3.5" /> New item</button>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Knowledge items</h2>
              <p className="text-xs text-slate-400">{filteredItems.length} results</p>
            </div>
            <div className="grid gap-3">
              {filteredItems.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-xs text-slate-400">{normalizeSourceLabel(item.sourceType)} • {item.category}</p>
                    </div>
                    <button onClick={() => mutateItem(item.id, { favorite: !item.favorite, bookmarked: !item.favorite })} className="rounded-full p-1 text-slate-400 hover:text-amber-300">
                      <Star className={`h-4 w-4 ${item.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{item.summary || 'No summary yet.'}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                    <p>Progress: {item.progress}%</p>
                    <p>Last opened: {formatDate(item.lastOpenedAt)}</p>
                    <p>Lessons: {item.lessonCount}</p>
                    <p>Notes: {item.noteCount}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(item.tags || []).slice(0, 5).map((tag) => <span key={`${item.id}-${tag}`} className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">{tag}</span>)}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <button onClick={() => handleOpenItem(item)} className="rounded-xl bg-cyan-600/90 px-2.5 py-1.5 text-white">Open</button>
                    <button onClick={() => handleContinueLearning(item)} className="rounded-xl border border-slate-700 px-2.5 py-1.5 text-slate-200">Continue learning</button>
                    <button onClick={() => mutateItem(item.id, { bookmarked: !item.bookmarked, favorite: !item.bookmarked })} className="rounded-xl border border-slate-700 px-2.5 py-1.5 text-slate-200">Bookmark</button>
                    <button onClick={() => mutateItem(item.id, { collection: item.collection === 'My Collection' ? 'General' : 'My Collection' })} className="rounded-xl border border-slate-700 px-2.5 py-1.5 text-slate-200">Add to collection</button>
                    <button onClick={() => handleDelete(item.id)} className="rounded-xl border border-rose-900 bg-rose-950/40 px-2.5 py-1.5 text-rose-200">Delete</button>
                    <button onClick={() => mutateItem(item.id, { saved: true })} className="rounded-xl border border-slate-700 px-2.5 py-1.5 text-slate-200">More</button>
                  </div>
                </article>
              ))}
              {!filteredItems.length ? <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No items match your current search and filters.</p> : null}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Selected workspace</h2>
                <div className="flex gap-1">
                  {DETAIL_TABS.map((tab) => (
                    <button key={tab} onClick={() => setWorkspaceTab(tab)} className={`rounded-lg px-2 py-1 text-[11px] ${workspaceTab === tab ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-400'}`}>{tab}</button>
                  ))}
                </div>
              </div>
              {selectedItem ? (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-white">{selectedItem.title}</h3>
                  {workspaceTab === 'Overview' ? <p className="text-sm text-slate-300">{selectedItem.summary || selectedItem.content || 'No overview available yet.'}</p> : null}
                  {workspaceTab === 'Lessons' ? (
                    <div className="space-y-2">
                      {deriveItemLessons(selectedItem).map((lesson) => (
                        <div key={lesson.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-sm text-slate-300">{lesson.title} <span className="text-xs text-cyan-200">{lesson.status}</span></div>
                      ))}
                    </div>
                  ) : null}
                  {workspaceTab === 'Notes' ? (
                    <div className="space-y-2">
                      {(selectedItem.notes || []).length ? selectedItem.notes.map((note, index) => (
                        <div key={`${selectedItem.id}-note-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-sm text-slate-300">{note}</div>
                      )) : <p className="text-sm text-slate-400">No notes available yet.</p>}
                    </div>
                  ) : null}
                  {workspaceTab === 'Timeline' ? (
                    <div className="space-y-2">
                      {(selectedItem.timeline || []).length ? selectedItem.timeline.map((entry, index) => (
                        <div key={`${selectedItem.id}-time-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-sm text-slate-300">{typeof entry === 'string' ? entry : entry.title || 'Timeline step'}</div>
                      )) : <p className="text-sm text-slate-400">Timeline is not generated for this item yet.</p>}
                    </div>
                  ) : null}
                </div>
              ) : <p className="text-sm text-slate-400">Select an item to view details.</p>}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-lg font-semibold text-white">AI knowledge tools</h2>
              {selectedItem ? (
                <div className="mt-3 space-y-3 text-sm text-slate-300">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-[0.14em] text-cyan-300">AI explanation</p><p className="mt-1">{selectedItem.content || selectedItem.summary || 'Explanation will appear after content is added.'}</p></div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Related topics</p><p className="mt-1">{[...(selectedItem.topics || []), ...(selectedItem.keywords || [])].slice(0, 6).join(', ') || 'No related topics yet.'}</p></div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Interview questions</p><ul className="mt-1 list-disc pl-5">{deriveInterviewQuestions(selectedItem).map((question) => <li key={question}>{question}</li>)}</ul></div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Quiz</p><ul className="mt-1 list-disc pl-5">{deriveQuickQuiz(selectedItem).map((question) => <li key={question}>{question}</li>)}</ul></div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Flashcards</p>{buildFallbackFlashcards(selectedItem).map((card) => <p key={card.front} className="mt-1"><span className="text-cyan-200">{card.front}:</span> {card.back}</p>)}</div>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-lg font-semibold text-white">Collections and bookmarks</h2>
              <div className="mt-3 grid gap-3 text-sm lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-400">Collections</p>
                  {(collections.length ? collections : ['General']).map((collectionName) => (
                    <div key={collectionName} className="mb-2 rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-slate-300">{collectionName}</div>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-400">Bookmarks</p>
                  {bookmarkedItems.length ? bookmarkedItems.slice(0, 6).map((item) => (
                    <button key={item.id} onClick={() => handleOpenItem(item)} className="mb-2 block w-full rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-left text-slate-300">{item.title}</button>
                  )) : <p className="text-slate-400">No bookmarks yet.</p>}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-lg font-semibold text-white">History and recommendations</h2>
              <div className="mt-3 grid gap-3 text-sm lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-400">Recently viewed</p>
                  {recentItems.length ? recentItems.map((item) => (
                    <button key={`recent-${item.id}`} onClick={() => handleOpenItem(item)} className="mb-2 block w-full rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-left text-slate-300">{item.title}</button>
                  )) : <p className="text-slate-400">No recent history yet.</p>}
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-400">Recommendations</p>
                  {recommendations.length ? recommendations.map((item) => (
                    <button key={`reco-${item.id}`} onClick={() => handleOpenItem(item)} className="mb-2 block w-full rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-left text-slate-300">{item.title}</button>
                  )) : <p className="text-slate-400">Recommendations will appear after you open more items.</p>}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
