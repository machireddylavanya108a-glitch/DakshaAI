import { useMemo } from 'react';
import { Maximize2, Minus, Plus, Move, Expand, Sparkles } from 'lucide-react';

const themeMap = {
  Aurora: { background: 'from-violet-500/20 to-cyan-500/10', node: '#7c3aed', line: '#22d3ee' },
  Nebula: { background: 'from-fuchsia-500/20 to-purple-500/10', node: '#a855f7', line: '#f472b6' },
  Ocean: { background: 'from-cyan-500/20 to-blue-500/10', node: '#0ea5e9', line: '#38bdf8' },
  Sunset: { background: 'from-orange-500/20 to-rose-500/10', node: '#f59e0b', line: '#fb923c' },
  Midnight: { background: 'from-slate-700/20 to-indigo-500/10', node: '#818cf8', line: '#c084fc' }
};

export default function MindMapCanvas({ map, searchTerm, theme, onSelectNode, onMoveNode, onToggleCollapse, fullscreen }) {
  const activeTheme = themeMap[theme] || themeMap.Aurora;

  const visibleNodes = useMemo(() => {
    if (!map?.nodes) return [];
    return map.nodes.filter((node) => !node.collapsed || node.label.toLowerCase().includes(searchTerm.toLowerCase()) || searchTerm === '');
  }, [map, searchTerm]);

  if (!map) {
    return <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">Generate a mind map to begin exploring the canvas.</div>;
  }

  return (
    <div className={`overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br ${activeTheme.background}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-slate-200">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-300" />
          <span>{map.title}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Move className="h-4 w-4" />
          <span>Drag • Zoom • Pan</span>
        </div>
      </div>

      <div className="relative h-[420px] overflow-hidden p-4">
        {visibleNodes.map((node) => (
          <div
            key={node.id}
            className="absolute cursor-pointer rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:scale-105"
            style={{ left: `${node.position.x}px`, top: `${node.position.y}px`, backgroundColor: node.color || activeTheme.node }}
            onClick={() => onSelectNode(node.id)}
            onDragEnd={(event) => onMoveNode(node.id, { x: event.clientX, y: event.clientY })}
            draggable
          >
            <div className="flex items-center gap-2">
              <span>{node.icon}</span>
              <span>{node.label}</span>
            </div>
          </div>
        ))}

        {map.connections?.map((connection) => {
          const from = visibleNodes.find((node) => node.id === connection.from);
          const to = visibleNodes.find((node) => node.id === connection.to);
          if (!from || !to) return null;
          return <div key={connection.id} className="absolute h-[2px] origin-left bg-white/40" style={{ left: `${from.position.x + 60}px`, top: `${from.position.y + 20}px`, width: `${Math.max(60, Math.abs(to.position.x - from.position.x) - 40)}px`, transform: `rotate(${Math.atan2(to.position.y - from.position.y, to.position.x - from.position.x)}rad)` }} />;
        })}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <button className="rounded-xl border border-white/10 bg-slate-900/70 p-2"><Minus className="h-4 w-4" /></button>
          <button className="rounded-xl border border-white/10 bg-slate-900/70 p-2"><Plus className="h-4 w-4" /></button>
          <button className="rounded-xl border border-white/10 bg-slate-900/70 p-2"><Expand className="h-4 w-4" /></button>
        </div>
        <div className="text-xs text-slate-400">{fullscreen ? 'Fullscreen mode' : 'Interactive canvas'}</div>
      </div>
    </div>
  );
}
