import { Camera, Upload, Image as ImageIcon, RefreshCw } from 'lucide-react';

export default function CameraCapture({ onCapture, onUpload, onUseCamera, loading, fileName, previewUrl, onReset }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Camera OCR Engine</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Capture or upload an image</h2>
        </div>
        {previewUrl ? (
          <button onClick={onReset} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Reset</button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button onClick={onUseCamera} className="rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 p-5 text-left text-emerald-200 transition hover:bg-emerald-500/20">
          <div className="flex items-center gap-3">
            <Camera className="h-6 w-6" />
            <span className="text-lg font-semibold">Open Live Camera</span>
          </div>
          <p className="mt-2 text-sm text-emerald-100/80">Use your webcam or mobile camera to capture text instantly.</p>
        </button>

        <label className="cursor-pointer rounded-[1.5rem] border border-sky-500/30 bg-sky-500/10 p-5 text-left text-sky-200 transition hover:bg-sky-500/20">
          <div className="flex items-center gap-3">
            <Upload className="h-6 w-6" />
            <span className="text-lg font-semibold">Upload Image</span>
          </div>
          <p className="mt-2 text-sm text-sky-100/80">Drag and drop or browse for a photo with text.</p>
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
        </label>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
        {previewUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Current image</p>
                <p className="font-medium text-white">{fileName || 'Captured image'}</p>
              </div>
              <button onClick={onCapture} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Analyze Image</button>
            </div>
            <img src={previewUrl} alt="Preview" className="h-72 w-full rounded-[1.5rem] object-contain" />
          </div>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-slate-400">
            <ImageIcon className="mb-3 h-10 w-10" />
            <p className="text-lg font-medium text-slate-300">No image selected yet</p>
            <p className="mt-2 max-w-md text-sm">Use your camera or upload a photo to start OCR and AI learning generation.</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Processing OCR, analysis, and lesson generation...
        </div>
      ) : null}
    </div>
  );
}
