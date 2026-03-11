import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { FeedbackProvider } from './context/FeedbackContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <FeedbackProvider>
          <DataProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </DataProvider>
        </FeedbackProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
