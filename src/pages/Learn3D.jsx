import { useState } from 'react';
import Interactive3DModel from '../components/Interactive3DModel';
import { get3DPartExplanation } from '../services/aiService';
import { Box, Loader, Brain } from 'lucide-react';

export default function Learn3D() {
  const [selectedPart, setSelectedPart] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePartClick = async (name) => {
    setSelectedPart(name);
    setLoading(true);
    setExplanation("");
    const aiResponse = await get3DPartExplanation(name);
    setExplanation(aiResponse);
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white px-8 py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">3D Interactive Learning</h1>
      <p className="text-slate-400 mb-8">Click on any object in the 3D space. Daksha AI will explain it to you instantly.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 h-[60vh] relative overflow-hidden">
          <Interactive3DModel selectedPart={selectedPart} onSelectPart={handlePartClick} />
          <div className="absolute bottom-4 left-4 bg-slate-950/80 px-4 py-2 rounded-lg text-sm text-slate-300 backdrop-blur-md">
            Drag to rotate • Scroll to zoom • Click objects
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 min-h-[200px]">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500" /> AI Explanation
            </h3>
            {!selectedPart && <p className="text-slate-500 text-sm">Click a 3D object to learn about it.</p>}
            {selectedPart && <h4 className="text-lg text-indigo-400 mb-2">{selectedPart}</h4>}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse">
                <Loader className="w-4 h-4 animate-spin" /> Daksha is analyzing...
              </div>
            )}
            {explanation && <p className="text-slate-300 text-sm leading-relaxed">{explanation}</p>}
          </div>
          
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Box className="w-5 h-5 text-indigo-500" /> Available Models</h3>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li className="p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">Solar System (Active)</li>
              <li className="p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors opacity-50">Human Brain (Coming Soon)</li>
              <li className="p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors opacity-50">Car Engine (Coming Soon)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
