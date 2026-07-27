import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { ToastProvider } from './components/Toast'
import { SiteLangProvider } from './i18n/LanguageContext'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'
import Result from './pages/Result'
import ServiceIntro from './pages/ServiceIntro'
import { UploadProvider } from './store/uploads'

function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <ToastProvider>
          <SiteLangProvider>
            <UploadProvider>
              <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/service" element={<ServiceIntro />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/result" element={<Result />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </UploadProvider>
          </SiteLangProvider>
        </ToastProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  )
}

export default App
