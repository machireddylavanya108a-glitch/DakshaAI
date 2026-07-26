import { Pencil, Plus, Trash2, GitMerge, Split, Link2, NotebookText } from 'lucide-react';

export default function MindMapEditor({ map, selectedNodeId, onAddNode, onDeleteNode, onRenameNode, onMergeNode, onSplitNode }) {
  const selectedNode = map?.nodes?.find((node) => node.id === selectedNodeId) || map?.nodes?.[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-pink-300">
        <Pencil className="h-4 w-4" /> Edit node
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        <div className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-500">Selected node</div>
        <div className="font-semibold text-white">{selectedNode?.label || 'No node selected'}</div>
        <div className="mt-2 text-xs text-slate-400">{selectedNode?.notes || 'Add notes, links, images, and custom metadata.'}</div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <button onClick={onAddNode} className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200"><Plus className="h-4 w-4" /> Add node</button>
        <button onClick={onDeleteNode} className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-3 text-sm text-red-200"><Trash2 className="h-4 w-4" /> Delete node</button>
        <button onClick={() => onRenameNode(prompt('Rename node', selectedNode?.label || ''))} className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-3 text-sm text-cyan-200"><Pencil className="h-4 w-4" /> Rename node</button>
        <button onClick={onMergeNode} className="flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3 py-3 text-sm text-violet-200"><GitMerge className="h-4 w-4" /> Merge nodes</button>
        <button onClick={onSplitNode} className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-3 text-sm text-amber-200"><Split className="h-4 w-4" /> Split node</button>
        <button className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-3 text-sm text-slate-200"><Link2 className="h-4 w-4" /> Add link</button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-400">
        <div className="mb-2 flex items-center gap-2"><NotebookText className="h-4 w-4 text-cyan-300" /> Notes</div>
        <textarea rows={4} className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none" placeholder="Add notes, examples, definitions, or dependencies" />
      </div>
    </div>
  );
}
