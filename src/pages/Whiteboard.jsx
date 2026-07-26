import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Sparkles, PanelsTopLeft, PenTool, StickyNote, Network, Type, Image as ImageIcon, FileText, MessageCircle, History, Download, Share2, BrainCircuit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import WhiteboardCanvas from '../components/whiteboard/WhiteboardCanvas';
import Toolbar from '../components/whiteboard/Toolbar';
import DrawingTools from '../components/whiteboard/DrawingTools';
import ShapeTools from '../components/whiteboard/ShapeTools';
import StickyNotes from '../components/whiteboard/StickyNotes';
import InfiniteCanvas from '../components/whiteboard/InfiniteCanvas';
import MindMapTool from '../components/whiteboard/MindMapTool';
import FlowchartTool from '../components/whiteboard/FlowchartTool';
import DiagramTool from '../components/whiteboard/DiagramTool';
import MathEditor from '../components/whiteboard/MathEditor';
import CodeBlock from '../components/whiteboard/CodeBlock';
import ImageTool from '../components/whiteboard/ImageTool';
import PDFAnnotation from '../components/whiteboard/PDFAnnotation';
import VoiceNotes from '../components/whiteboard/VoiceNotes';
import CollaborationPanel from '../components/whiteboard/CollaborationPanel';
import VersionHistory from '../components/whiteboard/VersionHistory';
import ExportPanel from '../components/whiteboard/ExportPanel';
import LoadingWhiteboard from '../components/whiteboard/LoadingWhiteboard';

const STORAGE_KEY = 'daksha-ai-whiteboards';

function createObject(type, x, y, label = '') {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    x,
    y,
    label,
    color: '#7c3aed',
    width: type === 'note' ? 180 : 140,
    height: type === 'note' ? 120 : 80,
    content: ''
  };
}

function createDefaultWhiteboard(title) {
  return {
    id: `whiteboard-${Date.now()}`,
    title: title || 'New AI Whiteboard',
    objects: [
      createObject('text', 120, 120, 'Topic'),
      createObject('note', 220, 220, 'Ideas'),
      createObject('arrow', 400, 140, ''),
      createObject('rectangle', 560, 120, 'System')
    ],
    history: [],
    collaborators: [{ name: 'You', role: 'Owner' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export default function Whiteboard() {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [status, setStatus] = useState('Ready to build your whiteboard');
  const [tool, setTool] = useState('select');
  const [theme, setTheme] = useState('midnight');
  const [title, setTitle] = useState('AI Whiteboard');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadBoards = async () => {
      if (!user?.uid) {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setBoards(stored);
        if (stored[0]) setSelectedBoard(stored[0]);
        return;
      }

      try {
        const q = query(collection(db, 'whiteboards'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setBoards(entries);
        if (entries[0]) setSelectedBoard(entries[0]);
      } catch (error) {
        console.error('Unable to load whiteboards:', error);
        setOffline(true);
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setBoards(stored);
        if (stored[0]) setSelectedBoard(stored[0]);
      }
    };

    loadBoards();
  }, [user?.uid]);

  const createBoard = () => {
    const board = createDefaultWhiteboard(title);
    setBoards((prev) => [board, ...prev]);
    setSelectedBoard(board);
    setStatus('Whiteboard created');
  };

  const saveBoard = async () => {
    if (!selectedBoard) return;
    const updated = { ...selectedBoard, title, updatedAt: new Date().toISOString() };

    try {
      if (user?.uid) {
        await addDoc(collection(db, 'whiteboards'), { userId: user.uid, ...updated });
      }
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const nextBoards = [updated, ...stored.filter((item) => item.id !== updated.id)].slice(0, 8);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBoards));
      setBoards(nextBoards);
      setOffline(false);
      setStatus('Saved to your whiteboards');
    } catch (error) {
      console.error('Unable to save whiteboard:', error);
      setOffline(true);
      setStatus('Saved locally');
    }
  };

  const updateBoard = (updater) => {
    setSelectedBoard((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setBoards((prevBoards) => prevBoards.map((board) => (board.id === prev.id ? next : board)));
      return next;
    });
  };

  const addObject = (type) => {
    updateBoard((prev) => ({ ...prev, objects: [...prev.objects, createObject(type, 180, 180)] }));
  };

  const applyTemplate = (templateName) => {
    const board = createDefaultWhiteboard(templateName);
    setSelectedBoard(board);
    setBoards((prev) => [board, ...prev]);
    setStatus(`${templateName} template applied`);
  };

  if (loading) return <LoadingWhiteboard />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Universal AI Whiteboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Create, teach, brainstorm, and design on an infinite AI-powered canvas</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">A premium whiteboard for learning, systems design, diagrams, planning, collaboration, and visual thinking.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> AI whiteboard workspace</div>
            </div>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Your board will sync when the connection is restored.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <Toolbar title={title} onTitleChange={setTitle} onCreate={createBoard} onSave={saveBoard} status={status} theme={theme} onThemeChange={setTheme} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <DrawingTools tool={tool} onToolChange={setTool} onAddObject={addObject} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <ShapeTools onAddObject={addObject} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <StickyNotes />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapTool />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <FlowchartTool />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <DiagramTool />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MathEditor />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <CodeBlock />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <ImageTool />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <PDFAnnotation />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <VoiceNotes />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <CollaborationPanel />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <VersionHistory />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <ExportPanel />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <InfiniteCanvas board={selectedBoard} onUpdateBoard={updateBoard} theme={theme} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <WhiteboardCanvas board={selectedBoard} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
