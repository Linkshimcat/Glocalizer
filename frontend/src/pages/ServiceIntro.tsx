import { ArrowLeft, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import proCards from '../assets/ServicePageLending/ProCards.png'
import iconCrop from '../assets/ServicePageLending/iconsax-crop.svg'
import iconFireworks from '../assets/ServicePageLending/iconsax-fireworks3.svg'
import iconImportArrow from '../assets/ServicePageLending/iconsax-import-arrow.svg'
import iconYoutube from '../assets/ServicePageLending/iconsax-youtube.png'
import Button from '../components/Button'
import Footer from '../components/Footer'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">{children}</h2>
}

export default function ServiceIntro() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        sticky
        center={<NavMenu />}
        right={
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-bold text-sub transition-colors hover:bg-surface hover:text-ink md:px-4 md:py-2 md:text-sm"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
            돌아가기
          </button>
        }
      />

      <main className="mx-auto w-full max-w-[960px] px-6 pb-24 pt-12 sm:px-10 sm:pt-16">
        <h1 className="text-[42px] font-extrabold leading-tight tracking-tight sm:text-[52px]">
          Glocalizer <span className="text-brand">서비스 소개</span>
        </h1>
        <p className="mt-6 text-xl font-bold leading-snug text-ink sm:text-2xl">
          &ldquo;K-이모티콘, 클릭 한 번으로 전 세계 언어가 되다.&rdquo;
        </p>
        <p className="mt-3 text-lg font-medium leading-relaxed text-sub sm:text-xl">
          한국 이모티콘 속 한글을 AI가 지우고, 그 나라 감성에 맞는 표현으로 바꿔주는 현지화 서비스예요.
        </p>

        {/* 이런 고민 */}
        <section className="mt-20">
          <SectionHeading>이런 고민, 해보셨나요? 🤔</SectionHeading>
          <p className="mt-6 text-lg font-medium leading-[1.85] text-sub">
            창작자가 국내에서 만든 이모티콘을 해외 마켓에 올리려면, 매번 두 가지 벽에 부딪혀요.
          </p>
          <ul className="mt-4 space-y-4 text-lg font-medium leading-[1.85] text-sub">
            <li className="flex gap-3">
              <span aria-hidden className="text-brand">•</span>
              <span>
                <span className="font-extrabold text-ink">번역의 벽</span> — &ldquo;열공&rdquo;, &ldquo;대박&rdquo; 같은
                밈은 단순 번역기로는 맛이 안 살아요. &ldquo;Hard study&rdquo;가 아니라 &ldquo;Grinding&rdquo;처럼 그 나라
                Z세대가 쓰는 말이어야 하죠.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="text-brand">•</span>
              <span>
                <span className="font-extrabold text-ink">이미지 수정의 벽</span> — 이미지 속 한글을 일일이 지우고, 새
                언어를 다시 얹는 포토샵 작업을 이모티콘 개수만큼 반복해야 해요.
              </span>
            </li>
          </ul>
          <p className="mt-4 text-lg font-medium leading-[1.85] text-sub">
            이 귀찮고 어려운 과정 때문에, 좋은 이모티콘이 국내에만 머무는 경우가 많아요.
          </p>
        </section>

        {/* 왜 Glocalizer인가요 */}
        <section className="mt-20">
          <SectionHeading>왜 Glocalizer인가요?</SectionHeading>
          <ul className="mt-6 space-y-4 text-lg font-medium leading-[1.85] text-sub">
            <li className="flex gap-3">
              <span aria-hidden className="text-brand">•</span>
              <span>
                <span className="font-extrabold text-ink">밈까지 살리는 번역</span> — 뜻만 맞는 게 아니라, 현지에서
                실제로 쓰는 말맛까지 담아요.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="text-brand">•</span>
              <span>
                <span className="font-extrabold text-ink">포토샵 없이 몇 초</span> — 전문 툴 없이도 누구나 이미지 속
                글자를 바꿀 수 있어요.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="text-brand">•</span>
              <span>
                <span className="font-extrabold text-ink">문턱 제로</span> — 로그인·결제 없이 바로 써볼 수 있어요.
              </span>
            </li>
          </ul>
        </section>

        {/* Glocalizer가 대신 해드려요 */}
        <section className="mt-20">
          <h2 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">
            Glocalizer가 <span className="text-brand">대신 해드려요!</span>
          </h2>
          <p className="mt-6 text-lg font-medium leading-[1.85] text-sub">
            이미지를 올리기만 하면, AI가{' '}
            <span className="font-extrabold text-ink">한글 감지 → 삭제 → 현지 표현으로 재삽입</span>까지 몇 초 만에
            끝내줘요. 창작자는 다운로드만 하면 바로 글로벌 마켓에 올릴 수 있어요.
          </p>
          <p className="mt-3 text-lg font-medium leading-[1.85] text-sub">
            <span className="font-extrabold text-ink">회원가입도 필요 없어요.</span> 접속해서 바로 올리고, 바꾸고,
            받으면 끝이에요.
          </p>

          <div className="mt-10 overflow-hidden rounded-[32px] bg-[#FAFBFC] p-8 sm:p-14">
            <img src={proCards} alt="사진 업로드, 한국어에서 현지화 번역, 이모티콘 다운로드로 이어지는 3단계 과정" className="w-full" />
          </div>
        </section>

        {/* 핵심 기능 3가지 */}
        <section className="mt-20">
          <h2 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">
            핵심 기능 <span className="text-brand">3가지</span>
          </h2>

          <div className="mt-8">
            <h3 className="flex items-center gap-2.5 text-xl font-extrabold text-ink sm:text-2xl">
              1. AI 초월 번역
              <img src={iconFireworks} alt="" aria-hidden className="h-6 w-6" />
            </h3>
            <p className="mt-2.5 text-lg font-medium leading-[1.85] text-sub">
              단순 직역이 아니라, 타깃 국가의 문화와 밈을 반영한 표현으로 바꿔요. 후보를 여러 개 보여줘서 마음에 드는
              걸 고르거나, 직접 입력할 수도 있어요.
            </p>
          </div>

          <div className="mt-10">
            <h3 className="flex items-center gap-2.5 text-xl font-extrabold text-ink sm:text-2xl">
              2. 스마트 캔버스
              <img src={iconCrop} alt="" aria-hidden className="h-6 w-6" />
            </h3>
            <p className="mt-2.5 text-lg font-medium leading-[1.85] text-sub">
              이미지 속 한글을 깔끔하게 지우고, 투명 배경을 그대로 유지해요.
              <br />
              그 위에 번역된 텍스트를 얹고 폰트·크기·색상·회전·테두리·그림자까지 자유롭게 다듬을 수 있어요.
            </p>
          </div>

          <div className="mt-10">
            <h3 className="flex items-center gap-2.5 text-xl font-extrabold text-ink sm:text-2xl">
              3. 바로 다운로드
              <img src={iconImportArrow} alt="" aria-hidden className="h-6 w-6" />
            </h3>
            <p className="mt-2.5 text-lg font-medium leading-[1.85] text-sub">
              완성된 이모티콘을 PNG · JPG 낱장 또는 ZIP으로 한 번에 받아요.
            </p>
          </div>
        </section>
      </main>

      <div className="h-16 w-full bg-surface sm:h-20" />

      <section className="mx-auto w-full max-w-[960px] px-6 py-20 sm:px-10">
        <h2 className="flex items-center gap-2.5 text-[28px] font-extrabold tracking-tight sm:text-[32px]">
          # 플랫폼 사용 방법 [영상]
          <img src={iconYoutube} alt="" aria-hidden className="h-7 w-7" />
        </h2>

        <div className="mx-auto mt-10 max-w-[600px] rounded-[28px] border-2 border-gray-200 p-7 sm:p-9">
          <p className="text-sm font-extrabold text-brand-dark">1단계 · 업로드</p>
          <h3 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[28px]">이모티콘을 올려주세요</h3>
          <p className="mt-1.5 text-base font-medium text-sub">
            PNG, JPG, GIF 파일을 끌어다 놓으면 바로 시작할 수 있어요.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 rounded-2xl bg-[#FAFBFC] px-6 py-10">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
              <Upload className="h-6 w-6 text-brand-dark" strokeWidth={2.5} />
            </span>
            <p className="text-center text-base font-bold">파일을 여기에 끌어다 놓으세요</p>
            <p className="text-center text-sm font-medium text-sub">
              PNG · JPG · GIF · 여러 장을 한 번에 올릴 수 있어요
            </p>
            <Button size="sm" className="pointer-events-none">
              파일 선택
            </Button>
          </div>

          <div className="mt-7 flex items-center justify-between">
            <p className="text-base font-bold">번역할 언어를 골라주세요</p>
            <span className="text-sm font-semibold text-brand-dark">전체 선택</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['🇺🇸 English', '🇯🇵 日本語', '🇨🇳 中文(简体)'].map(label => (
              <span
                key={label}
                className="rounded-xl border-2 border-gray-100 px-3 py-1.5 text-sm font-bold"
              >
                {label}
              </span>
            ))}
          </div>

          <Button className="pointer-events-none mt-7 w-full" disabled>
            번역 시작하기 →
          </Button>
          <p className="mt-2 text-center text-sm font-medium text-sub">이모티콘을 먼저 올려주세요.</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
