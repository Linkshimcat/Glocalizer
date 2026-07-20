import githubMark from '../assets/github-mark.svg'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-surface">
      <div className="mx-auto grid max-w-[1400px] gap-3 px-4 py-6 text-center md:grid-cols-3 md:items-center md:px-10 md:text-left">
        <div className="justify-self-center md:justify-self-start">
          <Logo />
        </div>
        <a
          href="https://github.com/Linkshimcat/Glocalizer"
          target="_blank"
          rel="noreferrer"
          aria-label="Glocalizer GitHub 저장소 열기"
          title="GitHub"
          className="justify-self-center p-1 text-ink transition-opacity hover:opacity-60"
        >
          <img src={githubMark} alt="" aria-hidden className="h-5 w-5" />
        </a>
        <div className="text-xs font-bold leading-relaxed text-sub sm:text-sm md:justify-self-end md:text-right">
          <p>Naver OGQ 공모전 · 박소연 | 이윤재 | 장예나 | 김래원</p>
          <p className="mt-1">미림마이스터고등학교 · Glocalizer Team</p>
        </div>
      </div>
    </footer>
  )
}
