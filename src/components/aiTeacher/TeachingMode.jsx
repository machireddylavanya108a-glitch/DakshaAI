import { Globe2, GraduationCap, Languages, Sparkles, UserRound } from 'lucide-react';

const teachingModes = [
  { id: 'simple', label: 'Simple Language', icon: Sparkles, description: 'Clear and easy explanations with simple words.' },
  { id: 'professional', label: 'Professional Language', icon: UserRound, description: 'Structured teaching with professional wording.' },
  { id: 'children', label: 'Children Mode', icon: Sparkles, description: 'Friendly teaching style with playful examples.' },
  { id: 'college', label: 'College Mode', icon: GraduationCap, description: 'Academic style with conceptual depth.' },
  { id: 'expert', label: 'Expert Mode', icon: GraduationCap, description: 'Advanced technical discussion and precision.' }
];

const languageOptions = [
  'English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi',
  'Odia', 'Urdu', 'Sanskrit', 'Assamese', 'Nepali', 'Sinhala', 'Arabic', 'French', 'German', 'Spanish',
  'Portuguese', 'Italian', 'Dutch', 'Russian', 'Ukrainian', 'Polish', 'Turkish', 'Greek', 'Swedish', 'Norwegian',
  'Danish', 'Finnish', 'Icelandic', 'Hungarian', 'Romanian', 'Czech', 'Slovak', 'Bulgarian', 'Serbian', 'Croatian',
  'Bosnian', 'Slovenian', 'Albanian', 'Lithuanian', 'Latvian', 'Estonian', 'Hebrew', 'Persian', 'Pashto', 'Kurdish',
  'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Indonesian', 'Malay', 'Filipino', 'Burmese', 'Khmer',
  'Lao', 'Mongolian', 'Kazakh', 'Uzbek', 'Azerbaijani', 'Armenian', 'Georgian', 'Swahili', 'Amharic', 'Somali',
  'Yoruba', 'Igbo', 'Hausa', 'Zulu', 'Xhosa', 'Afrikaans', 'Maori', 'Samoan', 'Tongan', 'Fijian',
  'Haitian Creole', 'Catalan', 'Basque', 'Galician', 'Irish', 'Welsh', 'Scottish Gaelic', 'Luxembourgish', 'Maltese', 'Belarusian',
  'Macedonian', 'Moldovan', 'Tajik', 'Kyrgyz', 'Turkmen', 'Tatar', 'Quechua', 'Aymara', 'Guarani', 'Inuktitut',
  'Esperanto', 'Latin', 'Bhojpuri', 'Maithili', 'Konkani', 'Manipuri', 'Dogri', 'Bodo', 'Santhali', 'Kashmiri'
];

export default function TeachingMode({ value, onChange }) {
  const setField = (field, fieldValue) => {
    onChange({
      ...value,
      [field]: fieldValue
    });
  };

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30" aria-label="Teaching mode selector">
      <div className="flex items-center gap-2 text-cyan-300">
        <Globe2 className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.3em]">Teaching Style</p>
      </div>

      <div className="mt-4 grid gap-3">
        {teachingModes.map((mode) => {
          const Icon = mode.icon;
          const active = value.mode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setField('mode', mode.id)}
              className={`rounded-2xl border px-4 py-3 text-left ${active ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/70'}`}
              aria-pressed={active}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Icon className="h-4 w-4" /> {mode.label}
              </div>
              <p className="mt-1 text-xs text-slate-400">{mode.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-center gap-2 text-cyan-300">
          <Languages className="h-4 w-4" />
          <p className="text-xs uppercase tracking-[0.3em]">Mixed Language Teaching</p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            Primary Language
            <select
              value={value.primaryLanguage}
              onChange={(event) => setField('primaryLanguage', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {languageOptions.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Secondary Language
            <select
              value={value.secondaryLanguage}
              onChange={(event) => setField('secondaryLanguage', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {languageOptions.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={Boolean(value.mixedLanguage)}
            onChange={(event) => setField('mixedLanguage', event.target.checked)}
          />
          Enable natural mixed language switching
        </label>
      </div>
    </section>
  );
}
