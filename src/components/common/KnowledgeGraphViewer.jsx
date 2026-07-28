import { useMemo, useState } from 'react';

function toNodeMap(nodes = []) {
  return new Map((nodes || []).map((node, index) => {
    const id = String(node?.id || `node-${index + 1}`);
    return [id, {
      id,
      label: String(node?.label || node?.name || id),
      type: String(node?.type || 'concept')
    }];
  }));
}

export default function KnowledgeGraphViewer({ data }) {
  const centralTopic = String(data?.centralTopic || data?.topic || 'Concept map');
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];
  const [activeNodeId, setActiveNodeId] = useState(nodes[0]?.id || '');

  const nodeMap = useMemo(() => toNodeMap(nodes), [nodes]);

  if (!nodes.length) {
    return <p className="text-slate-400">A concept map will be generated from the extracted ideas once the main concepts are identified.</p>;
  }

  const activeNode = nodeMap.get(activeNodeId) || nodeMap.values().next().value;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Central Topic</p>
        <p className="mt-1 text-sm font-semibold text-white">{centralTopic}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from(nodeMap.values()).slice(0, 18).map((node) => {
          const active = activeNode?.id === node.id;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => setActiveNodeId(node.id)}
              className={`rounded-full border px-3 py-1 text-xs ${active ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}
            >
              {node.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Connections</p>
        <div className="mt-2 space-y-2 text-sm text-slate-200">
          {edges.length === 0 ? (
            <p className="text-slate-400">No edges found yet.</p>
          ) : (
            edges.slice(0, 20).map((edge, index) => {
              const sourceId = String(edge?.source || edge?.from || '');
              const targetId = String(edge?.target || edge?.to || '');
              const sourceLabel = nodeMap.get(sourceId)?.label || sourceId || 'node';
              const targetLabel = nodeMap.get(targetId)?.label || targetId || 'node';
              const relation = String(edge?.relation || edge?.type || 'related-to');
              return <p key={`${sourceId}-${targetId}-${index}`}>{sourceLabel}{' -> '}{targetLabel} ({relation})</p>;
            })
          )}
        </div>
      </div>
    </div>
  );
}
