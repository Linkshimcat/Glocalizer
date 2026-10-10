import { lazy, Suspense, useEffect, useRef, type ComponentType } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { ToastProvider } from './components/Toast'
import { SiteLangProvider } from './i18n/LanguageContext'
import LandingRemake from './pages/LandingRemake'
import { AuthProvider } from './store/AuthContext'
import { UploadProvider } from './store/uploads'
import Header from './components/Header'

type PageModule = { default: ComponentType }

/** Lazy page whose code can be fetched ahead of time; once loaded it renders without suspending. */
function lazyPage(load: () => Promise<PageModule>) {
  let loaded: PageModule | undefined
  const preload = () => load().then(module => (loaded = module))
  // React.lazy resolves a synchronous thenable in the same render, so a preloaded page never shows the route fallback.
  const Page = lazy(() => (loaded ? ({ then: (resolve: (module: PageModule) => void) => resolve(loaded!) }) as Promise<PageModule> : preload()))
  return Object.assign(Page, { preload })
}

// 첫 진입 페이지(랜딩)만 즉시 로드하고, 나머지는 방문한 페이지 코드만 받도록 지연 로드한다.
const Dashboard = lazyPage(() => import('./pages/Dashboard'))
const Generate = lazyPage(() => import('./pages/Generate'))
const Localize = lazyPage(() => import('./pages/Localize'))
const Account = lazyPage(() => import('./pages/Account'))
const Archive = lazyPage(() => import('./pages/Archive'))
const Editor = lazyPage(() => import('./pages/Editor'))
const Login = lazyPage(() => import('./pages/Login'))
const Landing = lazyPage(() => import('./pages/Landing'))
const NaverCallback = lazyPage(() => import('./pages/NaverCallback'))
const NotFound = lazyPage(() => import('./pages/NotFound'))
const Privacy = lazyPage(() => import('./pages/Privacy'))
const Pricing = lazyPage(() => import('./pages/Pricing'))
const Result = lazyPage(() => import('./pages/Result'))
const Review = lazyPage(() => import('./pages/Review'))
const ServiceIntro = lazyPage(() => import('./pages/ServiceIntro'))
const Terms = lazyPage(() => import('./pages/Terms'))
const Support = lazyPage(() => import('./pages/Support'))

/** Public pages rendered to static HTML at build time (see scripts/prerender.mjs). */
// oxlint-disable-next-line react/only-export-components -- read once by main.tsx before the first render
export const PRERENDERED_PAGES: Record<string, { preload: () => Promise<unknown> }> = {
  '/': { preload: () => Promise.resolve() },
  '/service': ServiceIntro,
  '/pricing': Pricing,
  '/support': Support,
  '/privacy': Privacy,
  '/terms': Terms,
}

function RouteFallback() {
  return (
    <div role="status" aria-label="페이지를 불러오는 중" aria-busy="true" className="min-h-screen bg-[#FAFBFC]">
      <span className="sr-only">페이지를 불러오는 중</span>

      <div aria-hidden="true" className="layout-app animate-pulse py-10 motion-reduce:animate-none">
        <div className="h-4 w-24 rounded-full bg-brand-soft" />
        <div className="mt-5 h-10 w-3/5 max-w-md rounded-panel bg-gray-200" />
        <div className="mt-4 h-4 w-2/5 max-w-sm rounded-full bg-gray-100" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-56 rounded-panel border border-gray-100 bg-white" />
          ))}
        </div>
      </div>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  const firstPath = useRef(pathname)

  useEffect(() => {
    // The first page keeps the browser's own scroll position, which a visitor may have moved while a prerendered page loaded.
    if (pathname === firstPath.current) return
    firstPath.current = ''
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

/** Everything below the router, shared by the browser app and the build-time prerender. */
export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <AppErrorBoundary>
        <ToastProvider>
          <SiteLangProvider>
            <AuthProvider>
              <UploadProvider>
                <Header />
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<LandingRemake />} />
                    <Route path="/landing-remake" element={<LandingRemake />} />
                    <Route path="/landing-legacy" element={<Landing />} />
                    <Route path="/service" element={<ServiceIntro />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/support" element={<Support />} />
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
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <SpeedInsights />
    </BrowserRouter>
  )
}

export default App
