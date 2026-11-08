import { useSiteLang } from '../i18n/LanguageContext'
import { legalUi } from '../i18n/legalUi'
import githubMark from '../assets/github-mark.svg'
import { Link } from 'react-router-dom'
import InstagramIcon from './InstagramIcon'
import Logo from './Logo'
import '../footer.css'

// 모든 페이지가 랜딩과 같은 푸터를 쓴다. 예전에는 랜딩만 compact 레이아웃이고 나머지는 한 줄 3열 배치라
// 페이지마다 모양과 내용이 달랐다. landing-footer-* 클래스는 랜딩 전용 스타일(landing*.css)과 검사
// 스크립트가 쓰고 있어 그대로 둔다. 공통 모양은 footer.css가 어느 페이지에서나 같게 만든다.
export default function Footer({ showPaymentAttribution = false }: { showPaymentAttribution?: boolean }) {
  const { lang } = useSiteLang()
  const copy = legalUi[lang]
  const linkClass = 'inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-ink'
  return (
    <footer className="landing-footer landing-footer-compact border-t border-gray-200 bg-white">
      <div className="relative layout-wide landing-footer-inner py-5">
        <div className="landing-footer-top flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="landing-footer-brand flex items-center gap-3">
            <Logo />
            <a
              href="https://github.com/Linkshimcat/Glocalizer"
              target="_blank"
              rel="noreferrer"
              aria-label={copy.github}
              title="GitHub"
              className="flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-60"
            >
              <img src={githubMark} alt="" aria-hidden className="h-5 w-5 dark:invert" />
            </a>
            <a
              href="https://www.instagram.com/glocalizer__ogq/"
              target="_blank"
              rel="noreferrer"
              aria-label={copy.instagram}
              title="Instagram"
              className="flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-60"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          </div>
          <nav aria-label={copy.footerLinks} className="landing-footer-links flex flex-wrap justify-center gap-x-4 text-sm font-bold">
            <Link to="/privacy" className={linkClass}>{copy.privacy}</Link>
            <Link to="/terms" className={linkClass}>{copy.terms}</Link>
            <Link to="/support" className={linkClass}>{copy.customerSupport}</Link>
            <a href="https://github.com/Linkshimcat/Glocalizer?tab=Apache-2.0-1-ov-file" target="_blank" rel="noreferrer" className={linkClass}>Apache License 2.0</a>
          </nav>
        </div>
        <div className="landing-footer-meta mt-4 border-t border-gray-200 pt-3 text-center text-xs font-bold leading-relaxed text-sub sm:text-sm md:text-left">
          <p>{copy.school}</p>
          <p className="mt-1">{copy.team}</p>
          <p className="mt-1 flex flex-wrap justify-center gap-x-3 md:justify-start">
            <span>{copy.copyright}</span>
            <span>{copy.hosting}</span>
          </p>
          {showPaymentAttribution && <p className="mt-1 text-center md:text-left">
            Payment animation:{' '}
            <a href="https://iconscout.com/lottie-animations/payment-success" target="_blank" rel="noreferrer" className="underline underline-offset-2 transition-colors hover:text-ink">Payment Success</a>
            {' '}by{' '}
            <a href="https://iconscout.com/contributors/babaleo" target="_blank" rel="noreferrer" className="underline underline-offset-2 transition-colors hover:text-ink">Babaleo</a>
            {' '}on{' '}
            <a href="https://iconscout.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2 transition-colors hover:text-ink">IconScout</a>
          </p>}
        </div>
      </div>
    </footer>
  )
}
