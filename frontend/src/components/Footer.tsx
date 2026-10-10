import { useSiteLang } from '../i18n/LanguageContext'
import { legalUi } from '../i18n/legalUi'
import githubMark from '../assets/github-mark.svg'
import { Link } from 'react-router-dom'
import InstagramIcon from './InstagramIcon'
import Logo from './Logo'

export default function Footer({ variant = 'default' }: { variant?: 'default' | 'landing' }) {
  const { lang } = useSiteLang()
  const copy = legalUi[lang]
  const isLanding = variant === 'landing'
  return (
    <footer className={`border-t border-gray-200 bg-white${isLanding ? ' landing-footer' : ''}`}>
      <div className={`relative layout-wide py-5${isLanding ? ' landing-footer-inner' : ''}`}>
        <div className={`flex flex-col items-center justify-between gap-3 md:flex-row${isLanding ? ' landing-footer-top' : ''}`}>
          <div className={`flex items-center gap-3${isLanding ? ' landing-footer-brand' : ''}`}>
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
          <nav aria-label={copy.footerLinks} className={`flex flex-wrap justify-center gap-x-4 text-sm font-bold${isLanding ? ' landing-footer-links' : ''}`}>
            <Link to="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-ink">{copy.privacy}</Link>
            <Link to="/terms" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-ink">{copy.terms}</Link>
            <Link to="/support" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-ink">{copy.customerSupport}</Link>
            {isLanding && <a href="https://github.com/Linkshimcat/Glocalizer?tab=Apache-2.0-1-ov-file" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-ink">Apache License 2.0</a>}
          </nav>
        </div>
        <div className={`mt-4 border-t border-gray-200 pt-3 text-center text-xs font-bold leading-relaxed text-sub sm:text-sm md:text-left${isLanding ? ' landing-footer-meta' : ''}`}>
          {isLanding ? (
            <>
              <p>{copy.school}</p>
              <p className="mt-1">{copy.team}</p>
              <p className="mt-1 flex flex-wrap justify-center gap-x-3 md:justify-start">
                <span>{copy.copyright}</span>
                <span>{copy.hosting}</span>
              </p>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        {isLanding && <div
          className="landing-footer-watermark"
          aria-hidden="true"
          onPointerMove={(event) => {
            if (event.pointerType !== 'mouse') return
            const bounds = event.currentTarget.getBoundingClientRect()
            const x = ((event.clientX - bounds.left) / bounds.width) * 100
            const y = ((event.clientY - bounds.top) / bounds.height) * 100
            event.currentTarget.style.setProperty('--pointer-x', `${x}%`)
            event.currentTarget.style.setProperty('--pointer-y', `${y}%`)
          }}
          onPointerLeave={(event) => {
            event.currentTarget.style.removeProperty('--pointer-x')
            event.currentTarget.style.removeProperty('--pointer-y')
          }}
        >THANK YOU CREATOR</div>}
      </div>
    </footer>
  )
}
