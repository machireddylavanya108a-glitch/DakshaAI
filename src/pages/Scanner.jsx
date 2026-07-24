import { useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Brain, Sparkles, Loader } from 'lucide-react';
import { getDakshaImageResponse } from '../services/aiService';

export default function Scanner() {
  const [files, setFiles] = useState([]);
  const [extractedKnowledge, setExtractedKnowledge] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFiles([file]);

      if (file.type.startsWith('image/')) {
        setLoading(true);
        setExtractedKnowledge('');

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result.split(',')[1];
          const aiResponse = await getDakshaImageResponse(base64data, file.type);
          setExtractedKnowledge(aiResponse);
          setLoading(false);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white px-8 py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Universal Scanner</h1>
      <p className="text-slate-400 mb-8">Upload an image, diagram, or photo of notes. Daksha AI will read it and teach you about it.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-700 rounded-3xl cursor-pointer bg-slate-900 hover:border-indigo-500 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-12 h-12 text-indigo-500 mb-3" />
              <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-white">Click to upload</span> an image</p>
              <p className="text-xs text-slate-500">PNG, JPG, JPEG</p>
            </div>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-indigo-500" /> How it works</h3>
          <ul className="space-y-3 text-slate-400 text-sm">
            <li className="flex items-start gap-2"><Sparkles className="w-4 h-4 text-indigo-500 mt-1" /> Daksha scans diagrams, handwriting, and text for meaning.</li>
            <li className="flex items-start gap-2"><Sparkles className="w-4 h-4 text-indigo-500 mt-1" /> It identifies concepts, objects, formulas, and structure.</li>
            <li className="flex items-start gap-2"><Sparkles className="w-4 h-4 text-indigo-500 mt-1" /> Then it creates a clear learning summary instantly.</li>
          </ul>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-4">Processed File</h3>
          <div className="space-y-4">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-4 bg-slate-900 p-4 rounded-3xl border border-slate-800">
                <ImageIcon className="w-8 h-8 text-indigo-500" />
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                {loading ? (
                  <span className="text-sm text-indigo-400 flex items-center gap-2 animate-pulse">
                    <Loader className="w-4 h-4 animate-spin" /> Extracting Knowledge...
                  </span>
                ) : (
                  <span className="text-sm text-green-400">Completed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {extractedKnowledge && (
        <div className="mt-12 bg-slate-900 p-8 rounded-3xl border border-slate-800">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" /> Extracted Knowledge
          </h3>
          <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
            {extractedKnowledge}
          </div>
        </div>
      )}
    </div>
  );
}
