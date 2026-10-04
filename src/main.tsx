import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
// Fonts are bundled with the app (no third-party requests, available offline). Public Sans latin-ext carries
// the shekel sign; the browser only downloads it when that glyph is on screen.
import '@fontsource/public-sans/latin-400.css';
import '@fontsource/public-sans/latin-600.css';
import '@fontsource/public-sans/latin-ext-400.css';
import '@fontsource/public-sans/latin-ext-600.css';
import '@fontsource/fraunces/latin-600.css';
import './styles.css';
import { App } from './App';
import { StoreProvider } from './state/store';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
