import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteLang } from '../i18n/LanguageContext'
import type { SiteLang } from '../i18n/translations'
import macbookFrame from '../assets/LandingAssets/macbook_mockup_transparent.webp'
import iphoneFrame from '../assets/LandingAssets/iphone_17_pro_transparent.webp'
import ipadFrame from '../assets/LandingAssets/ipad_frame.webp'
import desktopCapture from '../assets/LandingAssets/desktop-captures/generate-project-ko.webp'
import phoneCapture from '../assets/LandingAssets/phone-captures/generate-project-ko.webp'
import '../landing-ending.css'

type EndingCopy = {
  title: string
  description: string
  cta: string
  desktopAlt: string
  tabletAlt: string
  phoneAlt: string
}

const COPY: Record<SiteLang, EndingCopy> = {
  ko: {
    title: '어떤 기기에서든,\n이모티콘 제작을\n시작하세요.',
    description: '캐릭터 생성부터 다국어 현지화,\n출시 전 검토까지 한곳에서 진행하세요.',
    cta: '워크스페이스 열기',
    desktopAlt: 'PC에서 열어 본 Glocalizer 생성 화면 예시',
    tabletAlt: '태블릿에서 열어 본 Glocalizer 생성 화면 예시',
    phoneAlt: '모바일에서 열어 본 Glocalizer 생성 화면 예시',
  },
  en: {
    title: 'Your device.\nYour next\nsticker project.',
    description: 'Create your character, localize captions,\nand review before release in one workspace.',
    cta: 'Open workspace',
    desktopAlt: 'Example Glocalizer creation screen on desktop, with Korean interface',
    tabletAlt: 'Example Glocalizer creation screen on a tablet, with Korean interface',
    phoneAlt: 'Example Glocalizer creation screen on mobile, with Korean interface',
  },
  ja: {
    title: 'どのデバイスでも、\nスタンプ制作を\n始めましょう。',
    description: 'キャラクター生成から多言語対応、\nリリース前の確認まで、一つのワークスペースで。',
    cta: 'ワークスペースを開く',
    desktopAlt: '韓国語のGlocalizer生成画面をPCで開いた例',
    tabletAlt: '韓国語のGlocalizer生成画面をタブレットで開いた例',
    phoneAlt: '韓国語のGlocalizer生成画面をモバイルで開いた例',
  },
  zh: {
    title: '使用您的设备，\n开始制作\n下一套表情。',
    description: '从角色生成、多语言本地化，\n到发布前检查，在同一个工作区完成。',
    cta: '打开工作区',
    desktopAlt: '在电脑上打开的Glocalizer生成页面示例，界面为韩语',
    tabletAlt: '在平板电脑上打开的Glocalizer生成页面示例，界面为韩语',
    phoneAlt: '在手机上打开的Glocalizer生成页面示例，界面为韩语',
  },
}

export default function LandingEnding() {
  const { lang } = useSiteLang()
  const copy = COPY[lang]
  return (
    <section id="main-ending" aria-labelledby="landing-ending-title" className="landing-ending">
      <div className="landing-ending-inner">
        <div className="landing-ending-copy">
          <h2 id="landing-ending-title">{copy.title.split('\n').map(line => <span key={line}>{line}</span>)}</h2>
          <p>{copy.description.split('\n').map(line => <span key={line}>{line}</span>)}</p>
          <Link to="/dashboard" className="landing-ending-cta">{copy.cta}<ArrowRight aria-hidden size={20} /></Link>
        </div>
        <div className="landing-ending-devices">
          <div className="landing-ending-laptop">
            <div className="landing-ending-laptop-screen"><img src={desktopCapture} alt={copy.desktopAlt} width={1280} height={1600} loading="lazy" decoding="async" /></div>
            <img src={macbookFrame} alt="" aria-hidden width={2048} height={1250} loading="lazy" decoding="async" className="landing-ending-device-frame" />
          </div>
          <div className="landing-ending-tablet">
            <div className="landing-ending-tablet-screen"><img src={desktopCapture} alt={copy.tabletAlt} width={1280} height={1600} loading="lazy" decoding="async" /></div>
            <img src={ipadFrame} alt="" aria-hidden width={2640} height={1880} loading="lazy" decoding="async" className="landing-ending-device-frame" />
          </div>
          <div className="landing-ending-phone">
            <div className="landing-ending-phone-screen"><img src={phoneCapture} alt={copy.phoneAlt} width={390} height={2430} loading="lazy" decoding="async" /></div>
            <img src={iphoneFrame} alt="" aria-hidden width={450} height={920} loading="lazy" decoding="async" className="landing-ending-device-frame" />
          </div>
        </div>
      </div>
    </section>
  )
}
