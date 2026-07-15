import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, GitFork, Upload, Sparkles, Download } from "lucide-react"
import { Logo } from "@/components/common/Logo"
import { Button } from "@/components/common/Button"
import { BeforeAfterDemo } from "@/components/landing/BeforeAfterDemo"
import { FeatureSection } from "@/components/landing/FeatureSection"
import { FinalCTA } from "@/components/landing/FinalCTA"

const GITHUB_URL = "https://github.com"

function Header({ onStart }: { onStart: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Glocalizer 홈">
          <Logo />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub에서 프로젝트 보기"
            className="flex size-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            <GitFork className="size-5" />
          </a>
          <Button size="sm" onClick={onStart}>
            시작하기
          </Button>
        </div>
      </div>
    </header>
  )
}

function Hero({
  onUpload,
}: {
  onUpload: () => void
}) {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
      <div className="animate-fade-up text-center">
        <h1 className="text-balance text-[40px] font-bold leading-[1.25] tracking-tight text-text-primary sm:text-[54px] lg:text-[64px]">
          한국 이모티콘, 전세계가 공감할 표현으로
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-[17px] leading-relaxed text-text-secondary sm:text-[20px]">
          이미지 속 한국어를 찾아서, 그 나라 사람들이 진짜 쓰는 말로 바꿔드려요.
        </p>
        <Button size="lg" className="mt-10" onClick={onUpload}>
          서비스 시작하기
          <ArrowRight className="size-5" />
        </Button>
      </div>

      <div className="animate-fade-up mt-20 rounded-[36px] bg-surface px-5 py-12 sm:mt-28 sm:px-12 sm:py-16">
        <div className="mx-auto max-w-[680px]">
          <BeforeAfterDemo />
        </div>
      </div>
    </section>
  )
}

const OLD_WORKFLOW = [
  "문구 번역하기",
  "이미지 편집기 열기",
  "원문 지우기",
  "번역문 넣기",
  "언어마다 반복하기",
]

function ProblemSection() {
  return (
    <section className="bg-surface">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-6 sm:py-28">
        <h2 className="mx-auto max-w-2xl text-balance text-center text-[28px] font-bold leading-tight tracking-tight text-text-primary sm:text-[36px]">
          번역만으로는 이모티콘의 개성을 온전히 살릴 수 없습니다.
        </h2>

        <div className="mx-auto mt-12 max-w-3xl">
          <p className="mb-4 text-center text-[14px] font-medium text-text-muted">
            기존 작업 방식
          </p>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            {OLD_WORKFLOW.map((step, i) => (
              <div key={step} className="flex items-center gap-2 sm:contents">
                <div className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-center text-[14px] font-medium text-text-secondary sm:flex-none">
                  {step}
                </div>
                {i < OLD_WORKFLOW.length - 1 ? (
                  <ArrowRight className="size-4 shrink-0 rotate-90 text-text-muted sm:rotate-0" />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-xl items-center justify-center gap-3 rounded-2xl bg-brand-soft px-6 py-5 text-center">
          <p className="text-[17px] font-semibold text-text-primary">
            Glocalizer에서는 하나의 작업 공간에서 모든 과정을 끝낼 수 있습니다.
          </p>
        </div>
      </div>
    </section>
  )
}

const PROCESS_STEPS = [
  {
    icon: Upload,
    title: "이모티콘 업로드",
    desc: "한국어 문구가 담긴 PNG 또는 GIF 파일을 한 장 혹은 여러 장 추가하세요.",
  },
  {
    icon: Sparkles,
    title: "표현 선택",
    desc: "목표 국가의 사용자에게 가장 잘 맞는 현지화 문구를 고르세요.",
  },
  {
    icon: Download,
    title: "글로벌 버전 내보내기",
    desc: "PNG 한 장 또는 전체 세트를 ZIP 파일로 내려받을 수 있습니다.",
  },
]

function ProcessSection() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6 sm:pb-28">
      <h2 className="text-center text-[28px] font-bold tracking-tight text-text-primary sm:text-[36px]">
        글로벌 이모티콘, 세 단계면 충분해요
      </h2>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {PROCESS_STEPS.map((step, i) => (
          <div
            key={step.title}
            className="rounded-[28px] bg-surface p-7"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand text-white">
                <step.icon className="size-5" />
              </span>
              <span className="text-[15px] font-bold text-brand">
                {i + 1}단계
              </span>
            </div>
            <h3 className="mt-5 text-[20px] font-bold text-text-primary">
              {step.title}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="text-[14px] text-text-muted">
            Team Glocalizer · NAVER OGQ Market AI 공모전 출품작
          </p>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <GitFork className="size-4" />
          GitHub
        </a>
      </div>
    </footer>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const goDashboard = () => navigate("/dashboard")

  return (
    <div className="min-h-dvh bg-background">
      <Header onStart={goDashboard} />
      <main>
        <Hero onUpload={goDashboard} />
        <ProblemSection />
        <FeatureSection />
        <ProcessSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
