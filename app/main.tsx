import React from 'react';
import ReactDOM from 'react-dom/client';

import createApp from './bootstrap/create-app';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>{createApp()}</React.StrictMode>
);
