import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Search, ShieldCheck, Star, Download, Layers3, Puzzle, Store } from 'lucide-react';
import PluginCard from '../../components/marketplace/PluginCard';
import PluginSearch from '../../components/marketplace/PluginSearch';
import FeaturedPlugins from '../../components/marketplace/FeaturedPlugins';
import Categories from '../../components/marketplace/Categories';
import { useAuth } from '../../context/AuthContext';

const seedPlugins = [
  {
    id: 'plugin-1',
    name: 'Math Mentor',
    tagline: 'Step-by-step math tutoring and explanation packs',
    category: 'AI Agent',
    price: 'Free',
    rating: 4.9,
    downloads: 18300,
    verified: true,
    description: 'Helps students solve equations, explain proofs, and build practice sets.',
    type: 'agent'
  },
  {
    id: 'plugin-2',
    name: 'Vision OCR',
    tagline: 'Extract text and structure from images and screenshots',
    category: 'OCR',
    price: '$9',
    rating: 4.8,
    downloads: 9200,
    verified: true,
    description: 'Adds OCR, handwriting recognition, and structured extraction to the scanner workspace.',
    type: 'tool'
  },
  {
    id: 'plugin-3',
    name: 'Glass Classroom',
    tagline: 'Education-first glass themes and immersive dashboard visuals',
    category: 'Theme',
    price: '$4',
    rating: 4.7,
    downloads: 5400,
    verified: true,
    description: 'Brings polished light and dark themes to the learning experience.',
    type: 'theme'
  }
];

export default function Marketplace() {
  const { user } = useAuth();
  const [plugins, setPlugins] = useState(seedPlugins);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    setPlugins(seedPlugins);
  }, []);

  const visiblePlugins = useMemo(() => {
    return plugins.filter((plugin) => {
      const matchesQuery = `${plugin.name} ${plugin.tagline} ${plugin.category}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'All' || plugin.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, plugins, query]);

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-cyan-300">
                <Store className="h-4 w-4" /> Daksha Marketplace
              </div>
              <h1 className="text-3xl font-semibold sm:text-4xl">Discover AI tools, agents, themes, and learning packs</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Install extensions from developers, teachers, and companies to personalize learning, automate workflows, and unlock new experiences.</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {user ? 'Signed in and ready to install plugins' : 'Browse and install once signed in'}
            </div>
          </div>
        </div>

        <FeaturedPlugins />
        <Categories onSelect={setCategory} />
        <PluginSearch value={query} onChange={setQuery} />

        <div className="grid gap-6 lg:grid-cols-3">
          {visiblePlugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center gap-2 text-cyan-300">
              <ShieldCheck className="h-5 w-5" /> Secure plugin ecosystem
            </div>
            <p className="text-sm text-slate-400">Every plugin is verified, sandboxed, and permission-based so teaching and enterprise deployments stay safe.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center gap-2 text-cyan-300">
              <Layers3 className="h-5 w-5" /> Multi-purpose extensions
            </div>
            <p className="text-sm text-slate-400">Build AI agents, widgets, course packs, themes, language packs, dashboards, and more with the Daksha SDK.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
