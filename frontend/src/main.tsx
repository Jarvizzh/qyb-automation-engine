import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './components/Toast/ToastContext.tsx'
import { ToastContainer } from './components/Toast/ToastContainer.tsx'
import { ConfirmProvider } from './contexts/ConfirmContext.tsx'
import { SessionProvider } from './contexts/SessionContext.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ToastContainer />
        <ConfirmProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)

