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
    <footer className="border-t border-gray-200 bg-white">
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
              className="flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-60"
            >
              <img src={githubMark} alt="" aria-hidden className="h-5 w-5" />
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
          <nav aria-label={copy.footerLinks} className="flex flex-wrap justify-center gap-x-4 text-sm font-bold">
            <Link to="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-ink">{copy.privacy}</Link>
            <Link to="/terms" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-ink">{copy.terms}</Link>
            <Link to="/support" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-ink">{copy.customerSupport}</Link>
          </nav>
        </div>
        <div className="mt-4 border-t border-gray-200 pt-3 text-center text-xs font-bold leading-relaxed text-sub sm:text-sm md:text-left">
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
                className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-ink"
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
