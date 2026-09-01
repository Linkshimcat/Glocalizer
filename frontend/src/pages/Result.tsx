import { ArrowLeft, Check, Home } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import sparkleDownload from '../assets/GCFrontendUI/SparkleDownload.svg'
import greenBackground from '../assets/LendingPage/GreenBackground-web.jpg'
import AILocalizationBadge from '../components/AILocalizationBadge'
import Button from '../components/Button'
import Header from '../components/Header'
import UploadSpecBadge from '../components/UploadSpecBadge'
import { toDemoItems } from '../data/demo'
import { DEFAULT_STYLE, resolveText } from '../lib/style'
import { useUploads } from '../store/uploads'
import { useSiteLang } from '../i18n/LanguageContext'

function StepIndicator() {
  const { t } = useSiteLang()
  return (
    <div className="flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-sub sm:gap-2 sm:text-xs md:text-sm">
      <span>1 {t.stepUpload}</span>
      <span>›</span>
      <span>2 {t.stepEdit}</span>
      <span>›</span>
      <span className="text-brand-dark">3 {t.stepDownload}</span>
    </div>
  )
}

export default function Result() {
  const navigate = useNavigate()
  const { t } = useSiteLang()
  const { files, targetLangs, styles, resetWorkflow, projectStatus, resultReady } = useUploads()
  const localizationFinished = projectStatus?.status === 'completed' || projectStatus?.status === 'failed'
  // 업로드 → AI 처리 → 에디터 다운로드를 완료하지 않고 주소로 직접 접근하는 경우를 막는다.
  if (files.length === 0 || !projectStatus) return <Navigate to="/dashboard" replace state={{ preserveWorkflow: true }} />
  if (!localizationFinished || !resultReady) return <Navigate to="/editor" replace />
  const languages = targetLangs.length > 0 ? targetLangs : [{ code: 'en', flag: '🇺🇸', label: 'English' }]

  const langLabel =
    targetLangs.length > 0
      ? targetLangs.map(l => `${l.flag} ${l.label}`).join(' · ')
      : '🇺🇸 English'

  return (
    <div className="min-h-screen bg-white">
      <Header right={<StepIndicator />} sticky />

      <main className="mx-auto max-w-[880px] px-6 py-16">
        {/* 완료 히어로 */}
        <div
          className="relative isolate flex min-h-[284px] flex-col items-center justify-center gap-5 rounded-[28px] bg-cover bg-center px-6 py-10 text-center before:pointer-events-none before:absolute before:-inset-1 before:-z-10 before:rounded-[32px] before:bg-[conic-gradient(from_120deg,rgba(34,197,94,0.72),rgba(45,212,191,0.55),rgba(125,211,252,0.5),rgba(244,114,182,0.42),rgba(250,204,21,0.32),rgba(34,197,94,0.72))] before:opacity-60 before:blur-2xl sm:px-8 sm:py-12"
          style={{ backgroundImage: `url(${greenBackground})` }}
        >
          <span className="relative flex h-16 w-16 items-center justify-center">
            {/* 퍼지는 링 */}
            <span className="animate-success-ring absolute inset-0 rounded-full bg-brand" />
            {/* 팝인되는 초록 원 */}
            <span className="animate-success-pop relative flex h-16 w-16 items-center justify-center rounded-full bg-brand shadow-[0_12px_32px_rgba(34,197,94,0.4)]">
              <Check
                className="animate-success-check h-8 w-8 text-white"
                strokeWidth={3.5}
              />
            </span>
          </span>
          <div>
            <h1 className="text-[32px] font-extrabold tracking-tight">
              {t.resultDone}
            </h1>
            <p className="mt-2 text-[16px] font-medium text-[#4E5968]">
              {t.resultDesc1.replace('{lang}', langLabel)}
              <br />
              {t.resultDesc2}
            </p>
          </div>
        </div>

        {/* 결과 미리보기 */}
        <section className="mt-12">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{t.resultPreviewTitle}</h2>
            <AILocalizationBadge />
            <UploadSpecBadge />
          </div>
          <div className="mt-4 space-y-7">
            {languages.map(language => {
              const items = toDemoItems(files, language.code)
              return (
                <section key={language.code}>
                  <h3 className="text-sm font-extrabold">{language.flag} {language.label}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                    {items.map(item => (
                      <div key={item.id} className="relative flex flex-col items-center gap-2 rounded-2xl border-2 border-gray-100 bg-white px-3 py-5">
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white"><Check className="h-3 w-3" strokeWidth={3.5} /></span>
                        {item.url ? <img src={item.url} alt={item.name} className="h-12 w-12 object-contain" /> : <span className="text-4xl">{item.emoji}</span>}
                        <span className="rounded-md bg-[#FFF9DB] px-2 py-0.5 text-[11px] font-bold text-[#92400E] line-through">{item.korean || t.resultNoText}</span>
                        <span className="rounded-md bg-brand-soft px-2 py-0.5 text-center text-[11px] font-bold text-brand-dark">{resolveText(styles[item.id]?.[language.code] ?? DEFAULT_STYLE, item.suggestions)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </section>

        {/* 하단 액션 */}
        <div className="mt-14 flex flex-col gap-3 md:flex-row">
          <Button
            variant="secondary"
            onClick={() => navigate('/editor')}
            className="min-h-14 flex-1 md:min-h-0"
          >
            <ArrowLeft className="h-4 w-4" /> {t.resultBackEditor}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              resetWorkflow()
              navigate('/')
            }}
            className="min-h-14 flex-1 md:min-h-0"
          >
            <Home className="h-4 w-4" /> {t.resultToMain}
          </Button>
          <Button
            onClick={() => {
              resetWorkflow()
              navigate('/dashboard')
            }}
            className="min-h-14 flex-1 md:min-h-0"
            glow
          >
            <img src={sparkleDownload} alt="" aria-hidden className="h-4 w-4" /> {t.resultRestart}
          </Button>
        </div>
      </main>
    </div>
  )
}
