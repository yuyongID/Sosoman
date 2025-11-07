import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { SessionProvider } from './store/sessionStore';
import './styles/global.css';

/**
 * Renderer entry point bootstrapping the React application.
 *
 * All global providers (router, state, theme) should be wired here to keep the
 * App component focused on layout and feature orchestration.
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Renderer root element missing');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </React.StrictMode>
);
