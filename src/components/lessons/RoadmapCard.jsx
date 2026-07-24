import { Network } from 'lucide-react';
export default function RoadmapCard({ roadmap }) {
  if (!roadmap || roadmap.length === 0) return null;
  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><Network className="w-5 h-5 text-indigo-500" /> Learning Roadmap</h3>
      <ul className="space-y-2 text-slate-300 text-sm list-disc list-inside">
        {roadmap.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}
