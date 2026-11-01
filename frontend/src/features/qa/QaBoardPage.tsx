import Footer from '../../components/Footer'
import { useSiteLang } from '../../i18n/LanguageContext'
import { qaCopy } from '../../i18n/qa'

// 본선 PR-0 스캐폴드 자리 — 담당: 래원 — FEAT-02 QA Board (docs/finals 참고)
export default function QaBoardPage() {
  const { lang } = useSiteLang()
  const copy = qaCopy(lang)

  return (
    <div className="flex min-h-svh flex-col">
      <main id="main-content" tabIndex={-1} className="layout-app flex-1 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.qaPageTitle}</h1>
        <p className="mt-2 font-medium text-sub">{copy.comingSoon}</p>
      </main>
      <Footer />
    </div>
  )
}
