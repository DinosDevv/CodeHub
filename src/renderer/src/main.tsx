import '@xterm/xterm/css/xterm.css'
import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { finishBoot } from './lib/boot'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Wait for the first frame of the app before draining the boot splash.
requestAnimationFrame(() => requestAnimationFrame(finishBoot))
