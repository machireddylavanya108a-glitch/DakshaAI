import { Search, Sparkles } from 'lucide-react';

export default function TopicInput({ value, onChange, onSubmit, loading }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-[2rem] border border-slate-800/70 bg-slate-900/70 p-3 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:flex-row">
      <div className="flex flex-1 items-center gap-3 rounded-[1.4rem] border border-slate-800 bg-slate-950/70 px-4 py-3">
        <Search className="h-5 w-5 text-indigo-400" />
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Ask for any topic to learn like a teacher"
          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-3 font-semibold text-white transition hover:scale-[1.01] disabled:opacity-60">
        <Sparkles className="h-4 w-4" />
        {loading ? 'Teaching...' : 'Teach Me'}
      </button>
    </form>
  );
}
