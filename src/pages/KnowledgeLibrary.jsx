import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Brain, Search, Sparkles, BookOpen, Bookmark, History, Star, Layers3, Mic, Languages, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { getIndexedDBItem, setIndexedDBItem } from '../utils/cache';
import LibraryDashboard from '../components/library/LibraryDashboard';
import UniversalSearch from '../components/library/UniversalSearch';
import SearchFilters from '../components/library/SearchFilters';
import KnowledgeCard from '../components/library/KnowledgeCard';
import KnowledgeViewer from '../components/library/KnowledgeViewer';
import CategoryBrowser from '../components/library/CategoryBrowser';
import Collections from '../components/library/Collections';
import Bookmarks from '../components/library/Bookmarks';
import RecentItems from '../components/library/RecentItems';
import TrendingTopics from '../components/library/TrendingTopics';
import Recommendations from '../components/library/Recommendations';
import CompareTopics from '../components/library/CompareTopics';
import AIExplain from '../components/library/AIExplain';
import RelatedTopics from '../components/library/RelatedTopics';
import KnowledgeTimeline from '../components/library/KnowledgeTimeline';
import LoadingLibrary from '../components/library/LoadingLibrary';

const STORAGE_KEY = 'daksha-ai-library';

function createEntry(title, source, category, tags = [], collection = 'My Library') {
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    source,
    category,
    tags,
    favorite: false,
    collection,
    summary: `A concise overview of ${title} for discovery, study, and comparison.`,
    explanation: `This entry helps learners understand ${title} through definitions, examples, applications, and roadmap guidance.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export default function KnowledgeLibrary() {
  const { user } = useAuth();
  const [libraryItems, setLibraryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [status, setStatus] = useState('Ready to explore knowledge');
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadLibrary = async () => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (stored[0]) {
        setLibraryItems(stored);
        setSelectedItem(stored[0]);
      }

      if (!user?.uid) {
        return;
      }

      try {
        const cachedEntries = await getIndexedDBItem('library', user.uid);
        if (cachedEntries?.length) {
          setLibraryItems(cachedEntries);
          if (cachedEntries[0]) setSelectedItem(cachedEntries[0]);
        }

        const q = query(collection(db, 'knowledgeLibrary'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const merged = entries.length ? entries : (stored.length ? stored : []);
        setLibraryItems(merged);
        await setIndexedDBItem('library', user.uid, merged);
        if (merged[0]) setSelectedItem(merged[0]);
      } catch (error) {
        console.error('Unable to load knowledge library:', error);
        setOffline(true);
        setLibraryItems(stored);
        if (stored[0]) setSelectedItem(stored[0]);
      }
    };

    loadLibrary();
  }, [user?.uid]);

  const filteredItems = useMemo(() => {
    return libraryItems.filter((item) => {
      const haystack = `${item.title} ${item.source} ${item.category} ${item.tags?.join(' ') || ''}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesFilter = filter === 'All' || (filter === 'Favorites' && item.favorite) || (filter === 'Bookmarks' && item.collection === 'Bookmarks');
      return matchesSearch && matchesFilter;
    });
  }, [libraryItems, search, filter]);

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);
  const favoriteItems = useMemo(() => libraryItems.filter((item) => item.favorite), [libraryItems]);

  useEffect(() => {
    setVisibleCount(4);
  }, [search, filter]);

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (nearBottom) {
        setVisibleCount((prev) => Math.min(prev + 4, filteredItems.length || prev));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredItems.length]);

  const addItem = useCallback(() => {
    const entry = createEntry('New Topic', 'User Input', 'General', ['ai', 'knowledge']);
    setLibraryItems((prev) => [entry, ...prev]);
    setSelectedItem(entry);
    setStatus('Knowledge entry added');
  }, []);

  const saveItem = useCallback(async () => {
    if (!selectedItem) return;
    const updated = { ...selectedItem, updatedAt: new Date().toISOString() };

    try {
      if (user?.uid) {
        await addDoc(collection(db, 'knowledgeLibrary'), { userId: user.uid, ...updated });
      }
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const nextItems = [updated, ...stored.filter((item) => item.id !== updated.id)].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
      if (user?.uid) await setIndexedDBItem('library', user.uid, nextItems);
      setLibraryItems(nextItems);
      setOffline(false);
      setStatus('Saved to Knowledge Library');
    } catch (error) {
      console.error('Unable to save library item:', error);
      setOffline(true);
      setStatus('Saved locally');
    }
  }, [selectedItem, user?.uid]);

  const toggleFavorite = useCallback((itemId) => {
    setLibraryItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, favorite: !item.favorite } : item)));
  }, []);

  if (loading) return <LoadingLibrary />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Universal Knowledge Library</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Discover, organize, compare, and understand any idea in the world</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">An intelligent knowledge operating system for books, research, code, media, documents, courses, and user-generated content.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-center gap-2"><Brain className="h-4 w-4" /> AI Knowledge OS</div>
            </div>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode. Items will be stored locally until sync is restored.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <LibraryDashboard onAdd={addItem} onSave={saveItem} status={status} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <UniversalSearch value={search} onChange={setSearch} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <SearchFilters value={filter} onChange={setFilter} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <CategoryBrowser />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <Collections />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <Bookmarks items={favoriteItems} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <RecentItems items={libraryItems.slice(0, 4)} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <TrendingTopics />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <Recommendations />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <KnowledgeViewer item={selectedItem || filteredItems[0]} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <CompareTopics />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <AIExplain item={selectedItem || filteredItems[0]} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <RelatedTopics />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <KnowledgeTimeline />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleItems.map((item) => (
                  <KnowledgeCard key={item.id} item={item} onSelect={setSelectedItem} onFavorite={toggleFavorite} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
