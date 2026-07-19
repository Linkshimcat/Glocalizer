import { ArrowLeft, Check, Home, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import { toDemoItems } from '../data/demo'
import { DEFAULT_STYLE, resolveText } from '../lib/style'
import { useUploads } from '../store/uploads'

function StepIndicator() {
  return (
    <div className="hidden items-center gap-2 text-sm font-semibold text-sub md:flex">
      <span>1 업로드</span>
      <span>›</span>
      <span>2 편집</span>
      <span>›</span>
      <span className="text-brand-dark">3 다운로드</span>
    </div>
  )
}

export default function Result() {
  const navigate = useNavigate()
  const { files, targetLangs, styles } = useUploads()
  const items = useMemo(() => toDemoItems(files), [files])

  const langLabel =
    targetLangs.length > 0
      ? targetLangs.map(l => `${l.flag} ${l.label}`).join(' · ')
      : '🇺🇸 English'

  return (
    <div className="min-h-screen bg-white">
      <Header right={<StepIndicator />} />

      <main className="mx-auto max-w-[880px] px-6 py-16">
        {/* 완료 히어로 */}
        <div className="flex flex-col items-center gap-5 rounded-[28px] bg-brand-soft px-8 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand shadow-[0_12px_32px_rgba(34,197,94,0.4)]">
            <Check className="h-8 w-8 text-white" strokeWidth={3.5} />
          </span>
          <div>
            <h1 className="text-[32px] font-extrabold tracking-tight">
              현지화가 끝났어요!
            </h1>
            <p className="mt-2 text-[16px] font-medium text-[#4E5968]">
              이모티콘 {items.length}장이 {langLabel}(으)로 번역됐어요.
              <br />
              다운로드가 시작됐는지 확인해보세요.
            </p>
          </div>
        </div>

        {/* 결과 미리보기 */}
        <section className="mt-12">
          <h2 className="text-lg font-bold">번역 결과 미리보기</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {items.map(item => (
              <div
                key={item.id}
                className="relative flex flex-col items-center gap-2 rounded-2xl border-2 border-gray-100 bg-white px-3 py-5"
              >
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
                {item.url ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  <span className="text-4xl">{item.emoji}</span>
                )}
                {item.korean ? (
                  <span className="rounded-md bg-[#FFF9DB] px-2 py-0.5 text-[11px] font-bold text-[#92400E] line-through">
                    {item.korean}
                  </span>
                ) : (
                  <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-bold text-sub">
                    텍스트 없음
                  </span>
                )}
                <span className="rounded-md bg-brand-soft px-2 py-0.5 text-center text-[11px] font-bold text-brand-dark">
                  {resolveText(styles[item.id] ?? DEFAULT_STYLE, item.suggestions)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 하단 액션 */}
        <div className="mt-14 flex flex-col gap-3 md:flex-row">
          <Button
            variant="secondary"
            onClick={() => navigate('/editor')}
            className="min-h-14 flex-1 md:min-h-0"
          >
            <ArrowLeft className="h-4 w-4" /> 에디터로 돌아가기
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/')}
            className="min-h-14 flex-1 md:min-h-0"
          >
            <Home className="h-4 w-4" /> 메인으로
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            className="min-h-14 flex-1 md:min-h-0"
            glow
          >
            <Sparkles className="h-4 w-4" /> 새로 시작하기
          </Button>
        </div>
      </main>
    </div>
  )
}
