import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Sparkles, Search, FileText, Star, FolderOpen, Share2, Download, PencilRuler, BrainCircuit, Languages, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import NotesDashboard from '../components/notes/NotesDashboard';
import NotesGenerator from '../components/notes/NotesGenerator';
import NotesCard from '../components/notes/NotesCard';
import NotesViewer from '../components/notes/NotesViewer';
import NotesEditor from '../components/notes/NotesEditor';
import NotesToolbar from '../components/notes/NotesToolbar';
import NotesSearch from '../components/notes/NotesSearch';
import NotesFilters from '../components/notes/NotesFilters';
import NotesFolder from '../components/notes/NotesFolder';
import NotesFavorites from '../components/notes/NotesFavorites';
import NotesHistory from '../components/notes/NotesHistory';
import NotesExport from '../components/notes/NotesExport';
import NotesShare from '../components/notes/NotesShare';
import LoadingNotes from '../components/notes/LoadingNotes';

const STORAGE_KEY = 'daksha-ai-notes';

function generateNoteData(form) {
  const title = `${form.topic || 'Universal Topic'} • ${form.format || 'Detailed Notes'}`;
  const language = form.language || 'English';
  const content = `# ${title}\n\n## Key Concepts\n- ${form.topic || 'Core concept'} is central to understanding the subject.\n- Connect theory with practical examples.\n\n## Important Definitions\n- Definition 1: ${form.topic || 'Foundational term'} is the core idea to learn.\n\n## Important Formulae\n- Formula: ${form.topic || 'Core formula'} = practical application + reasoning\n\n## Examples\n- Example: Apply the concept to a real-world case.\n\n## Interview Questions\n- How would you explain ${form.topic || 'this topic'} in simple terms?\n\n## Revision Tips\n- Review the main idea, definitions, and one example daily.\n\n## Memory Tricks\n- Use a simple story or mnemonic to remember the idea.\n`;

  return {
    id: `note-${Date.now()}`,
    title,
    sourceType: form.sourceType || 'Any Source',
    sourceName: form.sourceName || 'Uploaded Content',
    content,
    language,
    tags: [form.topic || 'General', form.format || 'Detailed', 'AI Generated'],
    favorite: false,
    folder: form.folder || 'General',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export default function AINotes() {
  const { user } = useAuth();
  const [form, setForm] = useState({ topic: 'Artificial Intelligence', sourceType: 'PDF', sourceName: 'Research Material', format: 'Detailed Notes', language: 'English', folder: 'General' });
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [status, setStatus] = useState('Ready to generate notes');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadNotes = async () => {
      if (!user?.uid) {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setNotes(stored);
        return;
      }

      try {
        const q = query(collection(db, 'aiNotes'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setNotes(entries);
      } catch (error) {
        console.error('Unable to load notes:', error);
        setOffline(true);
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setNotes(stored);
      }
    };

    loadNotes();
  }, [user?.uid]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = `${note.title} ${note.content} ${note.tags?.join(' ') || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'All' || (filter === 'Favorites' && note.favorite) || (filter === 'Folders' && note.folder);
      return matchesSearch && matchesFilter;
    });
  }, [notes, search, filter]);

  const generateNote = () => {
    const created = generateNoteData(form);
    setNotes((prev) => [created, ...prev]);
    setSelectedNote(created);
    setStatus('Notes generated successfully');
  };

  const saveNote = async () => {
    if (!selectedNote) return;

    const updated = { ...selectedNote, updatedAt: new Date().toISOString() };
    try {
      if (user?.uid) {
        await addDoc(collection(db, 'aiNotes'), { userId: user.uid, ...updated });
      }
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const nextNotes = [updated, ...stored.filter((item) => item.id !== updated.id)].slice(0, 8);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
      setNotes(nextNotes);
      setOffline(false);
      setStatus('Saved to your notes library');
    } catch (error) {
      console.error('Unable to save note:', error);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const nextNotes = [updated, ...stored.filter((item) => item.id !== updated.id)].slice(0, 8);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
      setNotes(nextNotes);
      setOffline(true);
      setStatus('Saved locally');
    }
  };

  const toggleFavorite = (noteId) => {
    setNotes((prev) => prev.map((note) => note.id === noteId ? { ...note, favorite: !note.favorite } : note));
  };

  const updateSelectedNote = (content) => {
    setSelectedNote((prev) => prev ? { ...prev, content, updatedAt: new Date().toISOString() } : prev);
  };

  if (loading) return <LoadingNotes />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Universal AI Notes Engine</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Generate intelligent notes from any source in the world</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Create structured, searchable, editable, multilingual notes from documents, media, code, research, lectures, and more.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI notes generator</div>
            </div>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Notes will be stored locally until the connection is restored.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesDashboard form={form} onChange={setForm} onGenerate={generateNote} onSave={saveNote} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesGenerator notes={notes} onGenerate={generateNote} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesSearch value={search} onChange={setSearch} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesFilters value={filter} onChange={setFilter} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredNotes.slice(0, 4).map((note) => (
                  <NotesCard key={note.id} note={note} onSelect={setSelectedNote} onFavorite={toggleFavorite} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesToolbar status={status} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesViewer note={selectedNote || filteredNotes[0]} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesEditor note={selectedNote || filteredNotes[0]} onChange={updateSelectedNote} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesFolder notes={notes} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesFavorites notes={notes.filter((note) => note.favorite)} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesHistory notes={notes.slice(0, 4)} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesExport note={selectedNote || filteredNotes[0]} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <NotesShare note={selectedNote || filteredNotes[0]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
