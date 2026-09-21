import { Loader2 } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { ToastProvider } from './components/Toast'
import { SiteLangProvider } from './i18n/LanguageContext'
import LandingRemake from './pages/LandingRemake'
import { AuthProvider } from './store/AuthContext'
import { UploadProvider } from './store/uploads'

// 첫 진입 페이지(랜딩)만 즉시 로드하고, 나머지는 방문한 페이지 코드만 받도록 지연 로드한다.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Generate = lazy(() => import('./pages/Generate'))
const Localize = lazy(() => import('./pages/Localize'))
const Account = lazy(() => import('./pages/Account'))
const Archive = lazy(() => import('./pages/Archive'))
const Editor = lazy(() => import('./pages/Editor'))
const Login = lazy(() => import('./pages/Login'))
const Landing = lazy(() => import('./pages/Landing'))
const NaverCallback = lazy(() => import('./pages/NaverCallback'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Result = lazy(() => import('./pages/Result'))
const Review = lazy(() => import('./pages/Review'))
const ServiceIntro = lazy(() => import('./pages/ServiceIntro'))
const Terms = lazy(() => import('./pages/Terms'))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <ToastProvider>
          <SiteLangProvider>
            <AuthProvider>
              <UploadProvider>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<LandingRemake />} />
                    <Route path="/landing-remake" element={<LandingRemake />} />
                    <Route path="/landing-legacy" element={<Landing />} />
                    <Route path="/service" element={<ServiceIntro />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/auth/naver/callback" element={<NaverCallback />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/generate" element={<Generate />} />
                    <Route path="/localize" element={<Localize />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/archive" element={<Archive />} />
                    <Route path="/editor" element={<Editor />} />
                    <Route path="/result" element={<Result />} />
                    <Route path="/review" element={<Review />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
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
