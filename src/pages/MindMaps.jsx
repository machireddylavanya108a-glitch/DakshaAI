import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Sparkles, Brain, Layers3, Languages, Clock3, Share2, Download, Star, History, Palette, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import MindMapDashboard from '../components/mindmaps/MindMapDashboard';
import MindMapGenerator from '../components/mindmaps/MindMapGenerator';
import MindMapCanvas from '../components/mindmaps/MindMapCanvas';
import MindMapToolbar from '../components/mindmaps/MindMapToolbar';
import MindMapEditor from '../components/mindmaps/MindMapEditor';
import MindMapSearch from '../components/mindmaps/MindMapSearch';
import MindMapHistory from '../components/mindmaps/MindMapHistory';
import MindMapTemplates from '../components/mindmaps/MindMapTemplates';
import MindMapExport from '../components/mindmaps/MindMapExport';
import MindMapShare from '../components/mindmaps/MindMapShare';
import LoadingMindMap from '../components/mindmaps/LoadingMindMap';

const STORAGE_KEY = 'daksha-ai-mindmaps';

function createNode(id, label, parentId, level, color, position, notes = '') {
  return {
    id,
    label,
    parentId,
    level,
    color,
    position,
    notes,
    icon: '✦',
    collapsed: false,
    link: ''
  };
}

function createDefaultNodes(topic, mapType) {
  const base = [
    createNode('root', topic, null, 0, '#7c3aed', { x: 280, y: 40 }, 'Central topic and primary focus'),
    createNode('branch-1', 'Core Concepts', 'root', 1, '#38bdf8', { x: 40, y: 180 }, 'Definitions and frameworks'),
    createNode('branch-2', 'Applications', 'root', 1, '#f59e0b', { x: 280, y: 180 }, 'Real-world use cases'),
    createNode('branch-3', 'Practice', 'root', 1, '#10b981', { x: 520, y: 180 }, 'Exercises and revision')
  ];

  const children = [
    createNode('leaf-1', 'Definitions', 'branch-1', 2, '#60a5fa', { x: 20, y: 320 }, 'Meaning and significance'),
    createNode('leaf-2', 'Examples', 'branch-1', 2, '#60a5fa', { x: 170, y: 320 }, 'Applied examples'),
    createNode('leaf-3', 'Tools', 'branch-2', 2, '#fbbf24', { x: 260, y: 320 }, 'Useful tools and frameworks'),
    createNode('leaf-4', 'Projects', 'branch-2', 2, '#fbbf24', { x: 430, y: 320 }, 'Practical implementations'),
    createNode('leaf-5', 'Revision', 'branch-3', 2, '#34d399', { x: 520, y: 320 }, 'Memory and review plan'),
    createNode('leaf-6', 'Roadmap', 'branch-3', 2, '#34d399', { x: 680, y: 320 }, 'Learning path and next steps')
  ];

  if (mapType.includes('Timeline')) {
    base[1].label = 'Timeline';
    base[2].label = 'Milestones';
    base[3].label = 'Outcomes';
  }

  if (mapType.includes('Decision')) {
    base[1].label = 'Choices';
    base[2].label = 'Consequences';
    base[3].label = 'Actions';
  }

  return [...base, ...children];
}

function createConnections(nodes) {
  return nodes.filter((node) => node.parentId).map((node) => ({
    id: `${node.id}-conn`,
    from: node.parentId,
    to: node.id
  }));
}

function generateMindMapData(form) {
  const topic = form.topic || 'Universal Topic';
  const mapType = form.mapType || 'Classic Mind Map';
  const nodes = createDefaultNodes(topic, mapType);
  const connections = createConnections(nodes);

  return {
    id: `mindmap-${Date.now()}`,
    title: `${topic} • ${mapType}`,
    sourceType: form.sourceType || 'Any Source',
    sourceName: form.sourceName || 'Uploaded Content',
    nodes,
    connections,
    language: form.language || 'English',
    theme: form.theme || 'Aurora',
    mapType,
    favorite: false,
    shared: false,
    downloads: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export default function MindMaps() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    topic: 'Artificial Intelligence',
    sourceType: 'PDF',
    sourceName: 'Research Material',
    mapType: 'Classic Mind Map',
    language: 'English',
    theme: 'Aurora'
  });
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState('root');
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState('Aurora');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [status, setStatus] = useState('Ready to generate a mind map');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadMaps = async () => {
      if (!user?.uid) {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setMaps(stored);
        if (stored[0]) {
          setSelectedMap(stored[0]);
          setSelectedNodeId(stored[0].nodes?.[0]?.id || 'root');
        }
        return;
      }

      try {
        const q = query(collection(db, 'mindMaps'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMaps(entries);
        if (entries[0]) {
          setSelectedMap(entries[0]);
          setSelectedNodeId(entries[0].nodes?.[0]?.id || 'root');
        }
      } catch (error) {
        console.error('Unable to load mind maps:', error);
        setOffline(true);
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setMaps(stored);
        if (stored[0]) {
          setSelectedMap(stored[0]);
          setSelectedNodeId(stored[0].nodes?.[0]?.id || 'root');
        }
      }
    };

    loadMaps();
  }, [user?.uid]);

  const filteredMaps = useMemo(() => {
    return maps.filter((map) => {
      const haystack = `${map.title} ${map.sourceType} ${map.sourceName} ${map.nodes?.map((node) => node.label).join(' ')}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [maps, search]);

  const updateForm = (valueOrUpdater) => {
    setForm((prev) => typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : { ...prev, ...valueOrUpdater });
  };

  const generateMap = () => {
    const created = generateMindMapData(form);
    setMaps((prev) => [created, ...prev]);
    setSelectedMap(created);
    setSelectedNodeId(created.nodes[0]?.id || 'root');
    setTheme(created.theme);
    setStatus('Mind map generated successfully');
  };

  const saveMap = async () => {
    if (!selectedMap) return;

    const updated = { ...selectedMap, updatedAt: new Date().toISOString(), theme };
    try {
      if (user?.uid) {
        await addDoc(collection(db, 'mindMaps'), { userId: user.uid, ...updated });
      }
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const nextMaps = [updated, ...stored.filter((item) => item.id !== updated.id)].slice(0, 8);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMaps));
      setMaps(nextMaps);
      setOffline(false);
      setStatus('Saved to your mind map library');
    } catch (error) {
      console.error('Unable to save mind map:', error);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const nextMaps = [updated, ...stored.filter((item) => item.id !== updated.id)].slice(0, 8);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMaps));
      setMaps(nextMaps);
      setOffline(true);
      setStatus('Saved locally');
    }
  };

  const updateMap = (updater) => {
    setSelectedMap((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setMaps((mapsPrev) => mapsPrev.map((item) => (item.id === prev.id ? next : item)));
      return next;
    });
  };

  const toggleFavorite = (mapId) => {
    setMaps((prev) => prev.map((item) => (item.id === mapId ? { ...item, favorite: !item.favorite } : item)));
  };

  const applyTemplate = (template) => {
    const nextForm = { ...form, mapType: template.name, theme: template.theme };
    setForm(nextForm);
    setTheme(template.theme);
    setStatus(`Applied ${template.name} template`);
  };

  const addNode = () => {
    updateMap((prev) => {
      const parentNode = prev.nodes.find((node) => node.id === selectedNodeId) || prev.nodes[0];
      const newNode = createNode(`node-${Date.now()}`, 'New Concept', parentNode.id, parentNode.level + 1, '#22d3ee', { x: parentNode.position.x + 60, y: parentNode.position.y + 90 }, 'Added concept');
      const next = {
        ...prev,
        nodes: [...prev.nodes, newNode],
        connections: [...prev.connections, { id: `${newNode.id}-conn`, from: parentNode.id, to: newNode.id }],
        updatedAt: new Date().toISOString()
      };
      setSelectedNodeId(newNode.id);
      return next;
    });
  };

  const deleteNode = () => {
    updateMap((prev) => {
      const target = prev.nodes.find((node) => node.id === selectedNodeId);
      if (!target || target.id === 'root') return prev;
      const next = {
        ...prev,
        nodes: prev.nodes.filter((node) => node.id !== target.id && node.parentId !== target.id),
        connections: prev.connections.filter((connection) => connection.to !== target.id && connection.from !== target.id),
        updatedAt: new Date().toISOString()
      };
      return next;
    });
  };

  const renameNode = (value) => {
    updateMap((prev) => {
      const target = prev.nodes.find((node) => node.id === selectedNodeId);
      if (!target) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((node) => (node.id === selectedNodeId ? { ...node, label: value } : node)),
        updatedAt: new Date().toISOString()
      };
    });
  };

  const moveNode = (nodeId, position) => {
    updateMap((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
      updatedAt: new Date().toISOString()
    }));
  };

  const mergeNode = () => {
    updateMap((prev) => {
      const target = prev.nodes.find((node) => node.id === selectedNodeId);
      if (!target || !target.parentId) return prev;
      const parent = prev.nodes.find((node) => node.id === target.parentId);
      const mergedLabel = `${parent?.label || 'Parent'} + ${target.label}`;
      return {
        ...prev,
        nodes: prev.nodes.filter((node) => node.id !== target.id),
        connections: prev.connections.filter((connection) => connection.to !== target.id && connection.from !== target.id),
        nodes: prev.nodes.map((node) => (node.id === parent?.id ? { ...node, label: mergedLabel } : node)).filter((node) => node.id !== target.id),
        updatedAt: new Date().toISOString()
      };
    });
  };

  const splitNode = () => {
    updateMap((prev) => {
      const target = prev.nodes.find((node) => node.id === selectedNodeId);
      if (!target) return prev;
      const child = createNode(`node-${Date.now()}`, `${target.label} Detail`, target.id, target.level + 1, '#fb7185', { x: target.position.x + 60, y: target.position.y + 90 }, 'Expanded branch');
      return {
        ...prev,
        nodes: [...prev.nodes, child],
        connections: [...prev.connections, { id: `${child.id}-conn`, from: target.id, to: child.id }],
        updatedAt: new Date().toISOString()
      };
    });
  };

  const toggleCollapse = (nodeId) => {
    updateMap((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === nodeId ? { ...node, collapsed: !node.collapsed } : node)),
      updatedAt: new Date().toISOString()
    }));
  };

  if (loading) return <LoadingMindMap />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-300">Universal AI Mind Maps</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Generate interactive mind maps from any source in the world</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Turn documents, notes, code, research, videos, audio, and ideas into animated, editable knowledge maps for learning, revision, planning, and discovery.</p>
            </div>
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
              <div className="flex items-center gap-2"><Brain className="h-4 w-4" /> AI mind map engine</div>
            </div>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Maps will be stored locally until the connection is restored.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapDashboard form={form} onChange={updateForm} onGenerate={generateMap} onSave={saveMap} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapGenerator maps={maps} onGenerate={generateMap} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapSearch value={search} onChange={setSearch} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapTemplates onApply={applyTemplate} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapHistory maps={filteredMaps.slice(0, 4)} onSelect={setSelectedMap} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapToolbar status={status} theme={theme} onThemeChange={setTheme} onFullscreen={() => setFullscreen((prev) => !prev)} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapCanvas map={selectedMap} searchTerm={search} theme={theme} onSelectNode={setSelectedNodeId} onMoveNode={moveNode} onToggleCollapse={toggleCollapse} fullscreen={fullscreen} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapEditor map={selectedMap} selectedNodeId={selectedNodeId} onAddNode={addNode} onDeleteNode={deleteNode} onRenameNode={renameNode} onMergeNode={mergeNode} onSplitNode={splitNode} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapExport map={selectedMap} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MindMapShare map={selectedMap} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
