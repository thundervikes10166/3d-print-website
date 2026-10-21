import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LabProvider } from './context/LabContext';
import './index.css';

createRoot(document.getElementById('root')!, {
  onUncaughtError(error, errorInfo) {
    console.error('UNCAUGHT_ROOT_ERROR:', error, errorInfo);
  },
  onCaughtError(error, errorInfo) {
    console.error('CAUGHT_ROOT_ERROR:', error, errorInfo);
  },
}).render(
  <StrictMode>
    <LabProvider>
      <App />
    </LabProvider>
  </StrictMode>,
);

