import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles.css';

// Handle direct pathname navigation with HashRouter (e.g. /catalog/showcase -> /#/catalog/showcase)
if (typeof window !== 'undefined' && window.location.pathname && window.location.pathname !== '/' && !window.location.hash) {
  const targetPath = window.location.pathname + window.location.search;
  window.location.replace(`${window.location.origin}/#${targetPath}`);
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
