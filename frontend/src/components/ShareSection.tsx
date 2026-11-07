import { Check, Link2, Mail, MessageCircle, Share2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSiteLang } from '../i18n/LanguageContext'
import type { SiteLang } from '../i18n/translations'
import macbookFrame from '../assets/LandingAssets/macbook_mockup_transparent.webp'
import iphoneFrame from '../assets/LandingAssets/iphone_17_pro_transparent.webp'
import desktopCapture from '../assets/LandingAssets/desktop-captures/generate-project-ko.webp'
import phoneCapture from '../assets/LandingAssets/phone-captures/generate-project-ko.webp'
import '../share-section.css'

type ShareCopy = {
  title: string
  description: string
  share: string
  copy: string
  copied: string
  shareTitle: string
  shareText: string
  desktopAlt: string
  phoneAlt: string
  sheetTitle: string
  sheetApps: [string, string, string, string]
  dialogCopy: string
  qrCaption: string
}

const SITE_URL = 'https://glocalizer.vercel.app/'
const SITE_HOST = 'glocalizer.vercel.app'

const COPY: Record<SiteLang, ShareCopy> = {
  ko: {
    title: '함께 만들 동료에게\nGlocalizer를 알려 주세요.',
    description: '링크 하나로 이모티콘 현지화 작업실을 공유할 수 있어요.',
    share: '공유하기',
    copy: '링크 복사',
    copied: '링크를 복사했어요',
    shareTitle: 'Glocalizer – 이모티콘 한글을 전 세계 언어로 현지화',
    shareText: '이모티콘 속 한글을 자연스러운 현지 표현으로 바꿔주는 AI 현지화 서비스',
    desktopAlt: 'PC에서 Glocalizer 링크를 QR 코드와 함께 공유하는 화면 예시',
    phoneAlt: '휴대폰에서 Glocalizer 링크를 공유하는 화면 예시',
    sheetTitle: '이모티콘 한글을 전 세계 언어로 현지화',
    sheetApps: ['메시지', '카카오톡', '메일', '링크 복사'],
    dialogCopy: '복사',
    qrCaption: '휴대폰 카메라로 스캔',
  },
  en: {
    title: 'Know someone who\nshould try Glocalizer?',
    description: 'Share the sticker localization workspace with a single link.',
    share: 'Share',
    copy: 'Copy link',
    copied: 'Link copied',
    shareTitle: 'Glocalizer – Localize Korean sticker text worldwide',
    shareText: 'An AI service that turns Korean text in stickers into natural local expressions',
    desktopAlt: 'Example of sharing the Glocalizer link on a PC, with a QR code',
    phoneAlt: 'Example of sharing the Glocalizer link on a phone',
    sheetTitle: 'Localize Korean sticker text worldwide',
    sheetApps: ['Messages', 'KakaoTalk', 'Mail', 'Copy link'],
    dialogCopy: 'Copy',
    qrCaption: 'Scan with your phone',
  },
  ja: {
    title: '一緒に作る仲間に\nGlocalizerを教えましょう。',
    description: 'リンク一つで、スタンプのローカライズ作業室を共有できます。',
    share: '共有する',
    copy: 'リンクをコピー',
    copied: 'リンクをコピーしました',
    shareTitle: 'Glocalizer – スタンプの韓国語を世界の言語へローカライズ',
    shareText: 'スタンプ内の韓国語を自然な現地表現に変えるAIローカライズサービス',
    desktopAlt: 'PCでGlocalizerのリンクをQRコードと共有する画面の例',
    phoneAlt: 'スマートフォンでGlocalizerのリンクを共有する画面の例',
    sheetTitle: 'スタンプの韓国語を世界の言語へローカライズ',
    sheetApps: ['メッセージ', 'カカオトーク', 'メール', 'コピー'],
    dialogCopy: 'コピー',
    qrCaption: 'スマホでスキャン',
  },
  zh: {
    title: '把 Glocalizer\n推荐给一起创作的伙伴。',
    description: '一个链接，即可分享表情本地化工作区。',
    share: '分享',
    copy: '复制链接',
    copied: '已复制链接',
    shareTitle: 'Glocalizer – 将表情中的韩文本地化为全球语言',
    shareText: '把表情中的韩文转换为自然本地表达的AI本地化服务',
    desktopAlt: '在电脑上通过二维码分享Glocalizer链接的画面示例',
    phoneAlt: '在手机上分享Glocalizer链接的画面示例',
    sheetTitle: '将表情中的韩文本地化为全球语言',
    sheetApps: ['信息', 'KakaoTalk', '邮件', '复制'],
    dialogCopy: '复制',
    qrCaption: '用手机扫描',
  },
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(field)
    field.select()
    try { return document.execCommand('copy') } catch { return false } finally { field.remove() }
  }
}

type Qr = { size: number; path: string }

export default function ShareSection() {
  const { lang } = useSiteLang()
  const copy = COPY[lang]
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [qr, setQr] = useState<Qr | null>(null)
  const [url, setUrl] = useState(SITE_URL)
  // off: 효과 없음(서버 렌더·움직임 줄이기) / wait: 화면 밖 대기 / in: 올라오는 중
  const [reveal, setReveal] = useState<'off' | 'wait' | 'in'>('off')
  const devicesRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const target = `${window.location.origin}/`
    setUrl(target)
    setCanShare(typeof navigator.share === 'function')

    // QR은 노트북(PC) 목업에서만 쓰이므로, 넓은 화면일 때만 라이브러리를 불러온다.
    const wide = window.matchMedia('(min-width: 768px)')
    let cancelled = false
    let loading = false
    const loadQr = () => {
      if (loading || !wide.matches) return
      loading = true
      import('qrcode').then(({ default: QRCode }) => {
        const { size, data } = QRCode.create(target, { errorCorrectionLevel: 'M' }).modules
        let path = ''
        for (let index = 0; index < data.length; index += 1) if (data[index]) path += `M${index % size} ${Math.floor(index / size)}h1v1h-1z`
        if (!cancelled) setQr({ size, path })
      }).catch(() => { loading = false })
    }
    loadQr()
    wide.addEventListener('change', loadQr)

    // 목업 안 공유 화면이 한 번만 올라오게 한다. 움직임을 줄인 환경에서는 건너뛴다.
    let observer: IntersectionObserver | undefined
    const element = devicesRef.current
    if (element && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReveal('wait')
      observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        setReveal('in')
        observer?.disconnect()
      }, { threshold: 0.4 })
      observer.observe(element)
    }
    return () => {
      cancelled = true
      wide.removeEventListener('change', loadQr)
      observer?.disconnect()
    }
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copyLink = async () => {
    if (!(await copyText(url))) return
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2200)
  }

  const share = async () => {
    try {
      await navigator.share({ title: copy.shareTitle, text: copy.shareText, url })
    } catch (error) {
      // 사용자가 공유창을 닫은 경우(AbortError)는 정상 동작이다.
      if (!(error instanceof DOMException && error.name === 'AbortError')) void copyLink()
    }
  }

  const [messages, kakao, mail, link] = copy.sheetApps

  return (
    <section className="share-section" aria-labelledby="share-title">
      <div className="share-inner">
        <div className="share-copy">
          <h2 id="share-title">{copy.title.split('\n').map(line => <span key={line}>{line}</span>)}</h2>
          <p>{copy.description}</p>
          <div className="share-actions">
            {canShare && <button type="button" className="share-button share-button-primary" onClick={share}><Share2 aria-hidden size={19} />{copy.share}</button>}
            <button type="button" className={`share-button${canShare ? '' : ' share-button-primary'}`} onClick={copyLink}>{copied ? <Check aria-hidden size={19} /> : <Link2 aria-hidden size={19} />}{copy.copy}</button>
          </div>
          <p className="share-status" role="status" aria-live="polite">{copied ? copy.copied : ''}</p>
        </div>

        <div ref={devicesRef} className="share-devices" data-reveal={reveal}>
          {/* 넓은 화면(PC): 노트북 목업 + 링크 공유 팝업 */}
          <div className="share-laptop">
            <div className="share-laptop-screen" role="img" aria-label={copy.desktopAlt}>
              <img src={desktopCapture} alt="" aria-hidden width={1280} height={1600} loading="lazy" decoding="async" />
              <div className="share-dim" aria-hidden />
              <div className="share-dialog" aria-hidden>
                <div className="share-dialog-info">
                  <div className="share-preview">
                    <img src="/favicon.png" alt="" width={64} height={64} loading="lazy" decoding="async" />
                    <div><strong>{copy.sheetTitle}</strong><span>{SITE_HOST}</span></div>
                  </div>
                  <div className="share-field"><span>{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span><b>{copy.dialogCopy}</b></div>
                </div>
                <figure className="share-dialog-qr">
                  <div>{qr && <svg viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges"><path d={qr.path} fill="#191f28" /></svg>}</div>
                  <figcaption>{copy.qrCaption}</figcaption>
                </figure>
              </div>
            </div>
            <img src={macbookFrame} alt="" aria-hidden width={2048} height={1250} loading="lazy" decoding="async" className="share-device-frame" />
          </div>

          {/* 좁은 화면(휴대폰): 폰 목업 + iOS 공유 시트 */}
          <div className="share-phone">
            <div className="share-phone-screen" role="img" aria-label={copy.phoneAlt}>
              <img src={phoneCapture} alt="" aria-hidden width={390} height={2430} loading="lazy" decoding="async" />
              <div className="share-dim" aria-hidden />
              <div className="share-sheet" aria-hidden>
                <div className="share-preview">
                  <img src="/favicon.png" alt="" width={64} height={64} loading="lazy" decoding="async" />
                  <div><strong>{copy.sheetTitle}</strong><span>{SITE_HOST}</span></div>
                </div>
                <div className="share-sheet-apps">
                  <span><i className="share-app-messages"><MessageCircle size="1em" fill="currentColor" /></i>{messages}</span>
                  <span><i className="share-app-kakao"><MessageCircle size="1em" fill="currentColor" /></i>{kakao}</span>
                  <span><i className="share-app-mail"><Mail size="1em" /></i>{mail}</span>
                  <span><i className="share-app-link"><Link2 size="1em" /></i>{link}</span>
                </div>
              </div>
            </div>
            <img src={iphoneFrame} alt="" aria-hidden width={450} height={920} loading="lazy" decoding="async" className="share-device-frame" />
          </div>
        </div>
      </div>
    </section>
  )
}
