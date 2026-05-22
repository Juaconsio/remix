import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

if (import.meta.env.DEV) {
  import('eruda').then(({ default: eruda }) => eruda.init());
}
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { SocketProvider } from './providers/SocketProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SocketProvider>
        <App />
      </SocketProvider>
    </BrowserRouter>
  </StrictMode>
);
