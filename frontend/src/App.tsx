import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { ToastProvider } from './components/Toast'
import { SiteLangProvider } from './i18n/LanguageContext'
import Dashboard from './pages/Dashboard'
import Generate from './pages/Generate'
import Localize from './pages/Localize'
import Account from './pages/Account'
import Archive from './pages/Archive'
import Editor from './pages/Editor'
import Landing from './pages/Landing'
import Login from './pages/Login'
import NaverCallback from './pages/NaverCallback'
import NotFound from './pages/NotFound'
import Result from './pages/Result'
import ServiceIntro from './pages/ServiceIntro'
import { AuthProvider } from './store/AuthContext'
import { UploadProvider } from './store/uploads'

function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <ToastProvider>
          <SiteLangProvider>
            <AuthProvider>
              <UploadProvider>
                <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/service" element={<ServiceIntro />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/naver/callback" element={<NaverCallback />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/generate" element={<Generate />} />
                <Route path="/localize" element={<Localize />} />
                <Route path="/account" element={<Account />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/editor" element={<Editor />} />
                <Route path="/result" element={<Result />} />
                <Route path="*" element={<NotFound />} />
                </Routes>
              </UploadProvider>
            </AuthProvider>
          </SiteLangProvider>
        </ToastProvider>
      </AppErrorBoundary>
      <SpeedInsights />
    </BrowserRouter>
  )
}

export default App
