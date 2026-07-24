/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        neon: '#38bdf8',
        midnight: '#020617',
        glass: 'rgba(15, 23, 42, 0.72)',
      },
      boxShadow: {
        glass: '0 40px 120px rgba(15, 23, 42, 0.25)',
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(circle at top, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at 20% 20%, rgba(120, 113, 255,0.12), transparent 20%), linear-gradient(180deg, #020617 0%, #050816 100%)',
      },
    },
  },
  plugins: [],
}