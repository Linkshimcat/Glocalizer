import githubMark from '../assets/github-mark.svg'
import Logo from './Logo'

export default function Footer() {
  return (
    // 글래스모피즘: 뒤 배경(히어로 그라데이션 등)이 비치도록 반투명 흰색 + 블러를 쓰고,
    // 위쪽 테두리와 안쪽 하이라이트로 유리 가장자리를 표현한다.
    <footer className="relative overflow-hidden rounded-t-[24px] border border-b-0 border-white/70 bg-white/40 shadow-[0_-10px_40px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150">
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/50 to-white/0" />
      <div className="relative layout-wide grid gap-3 py-6 text-center md:grid-cols-3 md:items-center md:text-left">
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
          <p className="mt-1">
            미림마이스터고등학교 · Glocalizer Team |{' '}
            <a
              href="https://github.com/Linkshimcat/Glocalizer?tab=Apache-2.0-1-ov-file"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-ink"
            >
              라이센스: Apache License 2.0
            </a>
          </p>
          <p className="mt-1 font-medium">
            <a
              href="https://www.magnific.com"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-ink"
            >
              designed by rawpixel.com - Magnific.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
