import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { applyTheme, getTheme } from './lib/theme';

applyTheme(getTheme());
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(getTheme()));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
