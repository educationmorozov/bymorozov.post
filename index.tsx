
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("Critical Render Error:", e);
  const fallback = document.getElementById('error-fallback');
  const msg = document.getElementById('error-message');
  if (fallback && msg) {
    fallback.style.display = 'flex';
    msg.innerText = e instanceof Error ? e.message : String(e);
  }
}
