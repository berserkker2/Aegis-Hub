import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SettingsWindow } from './components/SettingsWindow';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const params = new URLSearchParams(window.location.search);
const isSettingsView = params.get('view') === 'settings' || window.location.hash.includes('settings');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isSettingsView ? <SettingsWindow /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
