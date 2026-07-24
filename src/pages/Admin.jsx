export default function Admin() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white px-8 py-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
      <p className="text-slate-400 mb-8">Welcome, admin. Manage Daksha AI settings, users, and insights from here.</p>
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <h2 className="text-2xl font-semibold mb-2">System Overview</h2>
          <p className="text-slate-400">This area is reserved for admin-only controls and analytics.</p>
        </div>
      </div>
    </div>
  );
}
