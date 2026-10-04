import { useSiteLang } from '../i18n/LanguageContext'
import { legalUi } from '../i18n/legalUi'
import githubMark from '../assets/github-mark.svg'
import { Link } from 'react-router-dom'
import InstagramIcon from './InstagramIcon'
import Logo from './Logo'

export default function Footer() {
  const { lang } = useSiteLang()
  const copy = legalUi[lang]
  return (
    // 글래스모피즘: 뒤 배경(히어로 그라데이션 등)이 비치도록 반투명 흰색 + 블러를 쓰고,
    // 위쪽 테두리와 안쪽 하이라이트로 유리 가장자리를 표현한다.
    <footer className="relative overflow-hidden rounded-t-[24px] border border-b-0 border-white/70 bg-white/40 shadow-[0_-10px_40px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150">
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/50 to-white/0" />
      <div className="relative layout-wide py-5">
        <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex items-center gap-3">
            <Logo />
            <a
              href="https://github.com/Linkshimcat/Glocalizer"
              target="_blank"
              rel="noreferrer"
              aria-label={copy.github}
              title="GitHub"
              className="p-1 text-ink transition-opacity hover:opacity-60"
            >
              <img src={githubMark} alt="" aria-hidden className="h-5 w-5" />
            </a>
            <a
              href="https://www.instagram.com/glocalizer__ogq/"
              target="_blank"
              rel="noreferrer"
              aria-label={copy.instagram}
              title="Instagram"
              className="p-1 text-ink transition-opacity hover:opacity-60"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          </div>
          <nav aria-label={copy.footerLinks} className="flex justify-center gap-4 text-xs font-bold">
            <Link to="/privacy" className="underline underline-offset-2 transition-colors hover:text-ink">{copy.privacy}</Link>
            <Link to="/terms" className="underline underline-offset-2 transition-colors hover:text-ink">{copy.terms}</Link>
            <Link to="/support" className="underline underline-offset-2 transition-colors hover:text-ink">{copy.customerSupport}</Link>
          </nav>
        </div>
        <div className="mt-4 border-t border-white/70 pt-3 text-center text-xs font-bold leading-relaxed text-sub sm:text-sm md:text-left">
          <p>{copy.team}</p>
          <div className="mt-1 flex flex-col items-center gap-1 md:flex-row md:items-start md:justify-between md:gap-8">
            <p className="flex flex-wrap justify-center gap-x-3 md:justify-start">
              <span>{copy.copyright}</span>
              <span>{copy.hosting}</span>
            </p>
            <p className="md:text-right">
              {copy.school} |{' '}
              <a
                href="https://github.com/Linkshimcat/Glocalizer?tab=Apache-2.0-1-ov-file"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-ink"
              >
                {copy.license}: Apache License 2.0
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
