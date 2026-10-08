import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/ToastContext.jsx'
import { TrainingJobProvider } from './components/TrainingJobContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <TrainingJobProvider>
        <App />
      </TrainingJobProvider>
    </ToastProvider>
  </StrictMode>,
)
