import {
  ArrowLeft,
  Check,
  FileArchive,
  FileImage,
  Film,
  Home,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import { isGif, toDemoItems } from '../data/demo'
import {
  downloadBlob,
  exportFileName,
  renderItemToPng,
  zipItems,
} from '../lib/exportImage'
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

// GIF는 움직이는 원본(GIF)을 올렸을 때만 활성화
function downloadOptions(hasGif: boolean) {
  return [
    {
      icon: FileArchive,
      label: 'ZIP 패키지',
      sub: '모든 이모티콘 한 번에',
      highlight: true,
      disabled: false,
    },
    {
      icon: FileImage,
      label: 'PNG 파일',
      sub: '한 장씩 개별 저장',
      highlight: false,
      disabled: false,
    },
    {
      icon: Film,
      label: 'GIF 파일',
      sub: hasGif ? '움직이는 이모티콘용' : 'GIF 원본을 올리면 받을 수 있어요',
      highlight: false,
      disabled: !hasGif,
    },
  ]
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export default function Result() {
  const navigate = useNavigate()
  const { files, targetLangs, styles } = useUploads()
  const items = useMemo(() => toDemoItems(files), [files])
  const [busy, setBusy] = useState<string | null>(null)

  const langCode = targetLangs[0]?.code ?? 'en'

  const handleDownload = async (label: string) => {
    setBusy(label)
    try {
      if (label === 'ZIP 패키지') {
        downloadBlob(await zipItems(items, styles, langCode), 'glocalizer_export.zip')
      } else if (label === 'PNG 파일') {
        for (const item of items) {
          downloadBlob(
            await renderItemToPng(item, styles[item.id] ?? DEFAULT_STYLE),
            exportFileName(item.name, langCode, 'png'),
          )
          await sleep(300)
        }
      } else {
        for (const item of items.filter(isGif)) {
          if (!item.url) continue
          downloadBlob(
            await fetch(item.url).then(r => r.blob()),
            exportFileName(item.name, langCode, 'gif'),
          )
          await sleep(300)
        }
      }
    } finally {
      setBusy(null)
    }
  }

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
              원하는 형식으로 다운로드하세요.
            </p>
          </div>
        </div>

        {/* 다운로드 옵션 */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {downloadOptions(items.some(isGif)).map(
            ({ icon: Icon, label, sub, highlight, disabled }) => (
              <div
                key={label}
                className={`flex flex-col gap-4 rounded-[24px] border-2 p-6 ${
                  highlight
                    ? 'border-brand bg-brand-soft'
                    : disabled
                      ? 'border-gray-100 bg-surface opacity-70'
                      : 'border-gray-100 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      highlight ? 'bg-white' : 'bg-surface'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${disabled ? 'text-sub' : 'text-brand-dark'}`}
                    />
                  </span>
                  <div>
                    <p className="text-[15px] font-extrabold">{label}</p>
                    <p className="text-xs font-semibold text-sub">{sub}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={highlight ? 'primary' : 'secondary'}
                  glow={highlight}
                  disabled={disabled || busy !== null}
                  onClick={() => handleDownload(label)}
                >
                  {busy === label ? '만드는 중…' : '다운로드'}
                </Button>
              </div>
            ),
          )}
        </div>

        {/* 결과 미리보기 */}
        <section className="mt-14">
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
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4" /> 에디터로 돌아가기
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')} className="flex-1">
            <Home className="h-4 w-4" /> 메인으로
          </Button>
          <Button onClick={() => navigate('/dashboard')} className="flex-1" glow>
            <Sparkles className="h-4 w-4" /> 새로 시작하기
          </Button>
        </div>
      </main>
    </div>
  )
}
