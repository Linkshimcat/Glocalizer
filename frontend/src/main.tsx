import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { PRERENDERED_PAGES } from './App.tsx'

const container = document.getElementById('root')!
const render = () => createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// A prerendered page stays on screen until its route code is ready, then React swaps it in one commit.
const page = container.hasChildNodes() ? PRERENDERED_PAGES[window.location.pathname.replace(/\/$/, '') || '/'] : undefined
if (page) page.preload().then(render, render)
else render()
