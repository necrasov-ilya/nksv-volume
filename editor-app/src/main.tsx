import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles/base.css';
import './styles/editor.css';
import './styles/responsive.css';
import './styles/volume.css';
import './styles/theme-fixes.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="admin-app">
      <App />
    </div>
  </StrictMode>,
);