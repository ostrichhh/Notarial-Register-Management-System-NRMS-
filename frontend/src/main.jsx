import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyNrmsTheme, readNrmsTheme } from './lib/nrmsTheme'

applyNrmsTheme(readNrmsTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
