import { useNavigate } from 'react-router-dom'

export default function NavMenu() {
  const navigate = useNavigate()

  return (
    <nav aria-label="주요 메뉴" className="flex items-center gap-1">
      <button
        onClick={() => navigate('/dashboard')}
        className="rounded-xl bg-brand-soft px-3 py-1.5 text-[13px] font-bold text-brand-dark transition-colors hover:bg-brand hover:text-white md:px-4 md:py-2 md:text-sm"
      >
        시작하기
      </button>
      <button
        type="button"
        onClick={() => navigate('/service')}
        className="rounded-xl px-3 py-1.5 text-[13px] font-bold text-sub transition-colors hover:bg-surface hover:text-ink md:px-4 md:py-2 md:text-sm"
      >
        서비스 소개
      </button>
    </nav>
  )
}
