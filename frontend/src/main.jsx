import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
              },
              success: {
                style: { background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' },
              },
              error: {
                style: { background: '#ffe4e6', color: '#881337', border: '1px solid #fecdd3' },
              },
            }}
          />
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
)
