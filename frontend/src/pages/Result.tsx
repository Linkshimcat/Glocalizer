import { ArrowLeft, Check, Home, Sparkles } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import { toDemoItems } from '../data/demo'
import { DEFAULT_STYLE, resolveText } from '../lib/style'
import { useUploads } from '../store/uploads'
import { useSiteLang } from '../i18n/LanguageContext'

function StepIndicator() {
  const { t } = useSiteLang()
  return (
    <div className="hidden items-center gap-2 text-sm font-semibold text-sub md:flex">
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
  const { files, targetLangs, styles } = useUploads()
  // 업로드 없이 직접 접근하면 데모 데이터가 뜨므로 대시보드로 돌려보낸다.
  if (files.length === 0) return <Navigate to="/dashboard" replace />
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
        <div className="flex flex-col items-center gap-5 rounded-[28px] bg-brand-soft px-8 py-12 text-center">
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
          <h2 className="text-lg font-bold">{t.resultPreviewTitle}</h2>
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
            onClick={() => navigate('/')}
            className="min-h-14 flex-1 md:min-h-0"
          >
            <Home className="h-4 w-4" /> {t.resultToMain}
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            className="min-h-14 flex-1 md:min-h-0"
            glow
          >
            <Sparkles className="h-4 w-4" /> {t.resultRestart}
          </Button>
        </div>
      </main>
    </div>
  )
}
