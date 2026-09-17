import ReactDOM from 'react-dom/client';
import './assets/styles/globals.css';
import { App } from './App';
declare global {
  interface Window {
    __REACT_ROOT__?: ReactDOM.Root;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

try {
  if (!window.__REACT_ROOT__) {
    window.__REACT_ROOT__ = ReactDOM.createRoot(rootElement);
  }
  window.__REACT_ROOT__.render(<App />);
} catch (err) {
  console.error('[Fatal Mount Error]:', err);
  rootElement.innerHTML = `<div style="color:#f43f5e;background:#18181b;padding:24px;font-family:monospace;height:100vh;"><h2>Failed to render App</h2><pre>${err instanceof Error ? err.stack : String(err)}</pre></div>`;
}
