import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
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
    <div role="status" aria-label="페이지를 불러오는 중" aria-busy="true" className="min-h-screen bg-[#FAFBFC]">
      <span className="sr-only">페이지를 불러오는 중</span>
      <div aria-hidden="true" className="h-[72px] border-b border-gray-100 bg-white" />
      <div aria-hidden="true" className="layout-app animate-pulse py-10 motion-reduce:animate-none">
        <div className="h-4 w-24 rounded-full bg-brand-soft" />
        <div className="mt-5 h-10 w-3/5 max-w-md rounded-xl bg-gray-200" />
        <div className="mt-4 h-4 w-2/5 max-w-sm rounded-full bg-gray-100" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-56 rounded-[28px] border border-gray-100 bg-white" />
          ))}
        </div>
      </div>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
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
