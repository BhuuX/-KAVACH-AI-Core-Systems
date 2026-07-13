import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'

const PROD_API_URL = 'https://kavacha-50043932263.development.catalystappsail.in';

// Global fetch interceptor to route /api/* to the Zoho Catalyst AppSail backend in production
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  let target = input;
  if (typeof target === 'string' && target.startsWith('/api/')) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      target = `${PROD_API_URL}${target}`;
    }
  }
  return originalFetch(target, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

