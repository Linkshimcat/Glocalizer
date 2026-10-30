import { lazy, Suspense, useEffect, useRef, type ComponentType } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { ToastProvider } from './components/Toast'
import { SiteLangProvider } from './i18n/LanguageContext'
import LandingRemake from './pages/LandingRemake'
import { AccountExportProvider } from './store/AccountExportContext'
import { AuthProvider } from './store/AuthContext'
import { ThemeProvider } from './store/ThemeContext'
import { UploadProvider } from './store/uploads'
import Header from './components/Header'
import { useSiteLang } from './i18n/LanguageContext'
import { experienceCopy } from './i18n/experience'

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
const CaptionSuggest = lazyPage(() => import('./pages/CaptionSuggest'))
const Editor = lazyPage(() => import('./pages/Editor'))
const Login = lazyPage(() => import('./pages/Login'))
const Landing = lazyPage(() => import('./pages/Landing'))
const LandingDesignSample = lazyPage(() => import('./pages/LandingDesignSample'))
const NaverCallback = lazyPage(() => import('./pages/NaverCallback'))
const KakaoCallback = lazyPage(() => import('./pages/KakaoCallback'))
const NotFound = lazyPage(() => import('./pages/NotFound'))
const Privacy = lazyPage(() => import('./pages/Privacy'))
const Pricing = lazyPage(() => import('./pages/Pricing'))
const PaymentSuccess = lazyPage(() => import('./pages/PaymentSuccess'))
const PaymentFail = lazyPage(() => import('./pages/PaymentFail'))
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
  const { lang } = useSiteLang()
  const copy = experienceCopy[lang]
  return (
    <main id="main-content" tabIndex={-1} role="status" aria-label={copy.loading} aria-busy="true" className="min-h-screen bg-[#FAFBFC]">
      <span className="sr-only">{copy.loading}</span>

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
    </main>
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

// Pages a visitor most likely opens next, in the order to fetch them.
const LIKELY_NEXT_PAGES = [Login, Dashboard, Localize, ServiceIntro, Pricing, Generate]

/**
 * Fetches the code of likely next pages once the current screen has settled and the browser is idle.
 * Without it the code is requested only when a menu item is first tapped, and on mobile the previous page then
 * stays on screen with no sign of progress for 1-4 seconds.
 * Starting a navigation stops the remaining fetches so they never share bandwidth with the page being opened;
 * they are scheduled again once the new page is on screen.
 */
function PrefetchLikelyPages() {
  const { pathname } = useLocation()

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (connection?.saveData || /2g$/.test(connection?.effectiveType ?? '')) return
    let cancelled = false
    const run = async () => {
      // One at a time so this never competes with images or video that are still loading.
      for (const page of LIKELY_NEXT_PAGES) {
        if (cancelled) return
        await page.preload().catch(() => undefined)
      }
    }
    const schedule = () => {
      if (cancelled) return
      if (typeof requestIdleCallback === 'function') requestIdleCallback(() => { void run() }, { timeout: 4000 })
      else window.setTimeout(() => { void run() }, 1500) // Safari has no requestIdleCallback
    }
    // The router only reports the new location once the page is ready, so stop at the click itself.
    const stopForNavigation = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.('a[href]')) cancelled = true
    }
    document.addEventListener('click', stopForNavigation, true)
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('load', schedule)
      document.removeEventListener('click', stopForNavigation, true)
    }
  }, [pathname])

  return null
}

/** Everything below the router, shared by the browser app and the build-time prerender. */
export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <PrefetchLikelyPages />
      <ThemeProvider>
        <SiteLangProvider>
          <AppErrorBoundary>
            <ToastProvider>
              <AuthProvider>
                <AccountExportProvider>
                <UploadProvider>
                  <Header />
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<LandingRemake />} />
                      <Route path="/landing-remake" element={<LandingRemake />} />
                      <Route path="/landing-legacy" element={<Landing />} />
                      <Route path="/sub1" element={<LandingDesignSample />} />
                      <Route path="/sub2" element={<LandingDesignSample />} />
                      <Route path="/sub3" element={<LandingDesignSample />} />
                      <Route path="/service" element={<ServiceIntro />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/payment/success" element={<PaymentSuccess />} />
                      <Route path="/payment/fail" element={<PaymentFail />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/support" element={<Support />} />
                      <Route path="/auth/naver/callback" element={<NaverCallback />} />
                      <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/generate" element={<Generate />} />
                      <Route path="/localize" element={<Localize />} />
                      <Route path="/caption-suggest" element={<CaptionSuggest />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/archive" element={<Archive />} />
                      <Route path="/editor" element={<Editor />} />
                      <Route path="/result" element={<Result />} />
                      <Route path="/review" element={<Review />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </UploadProvider>
                </AccountExportProvider>
              </AuthProvider>
            </ToastProvider>
          </AppErrorBoundary>
        </SiteLangProvider>
      </ThemeProvider>
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
