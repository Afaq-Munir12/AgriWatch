import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { ComplaintsProvider } from './store/ComplaintsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <ComplaintsProvider>
        <App />
      </ComplaintsProvider>
    </LanguageProvider>
  </StrictMode>,
)
