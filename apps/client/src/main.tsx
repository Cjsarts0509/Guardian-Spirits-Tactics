import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {sfx} from './sfx.js';
import { App } from './App.js';
import './styles.css';
import './overhaul.css';
import './feedback.css';

document.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest('button');if(b&&!b.disabled)sfx.play('ui_click');});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
