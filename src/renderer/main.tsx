import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { WalletProvider } from './context/WalletContext';
import { ToastProvider } from './context/ToastContext';
import './index.css';

window.addEventListener('error', (e) => {
  // Surface renderer crashes into main logs via console forwarding.
  console.error('[renderer] window.error', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[renderer] unhandledrejection', e.reason);
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  // If root is missing, show something visible.
  document.body.innerHTML = '<pre style="color:#fff;padding:16px">Fatal: #root not found</pre>';
  throw new Error('#root not found');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>
);
