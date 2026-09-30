import './globals.css';
import './i18n';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import { ErrorBoundaryFallback } from '@/components/ErrorBoundaryFallback.tsx';

import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
