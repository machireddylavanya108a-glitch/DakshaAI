import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch((error) => console.error('Service worker registration failed:', error));
      return;
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  });
}

createRoot(document.getElementById('root')).render(
  <App />,
)