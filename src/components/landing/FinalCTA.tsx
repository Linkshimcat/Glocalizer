import { useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/common/Button"

export function FinalCTA() {
  const navigate = useNavigate()
  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 pb-24 sm:px-6">
      <div className="flex flex-col items-center rounded-[28px] bg-surface px-6 py-16 text-center sm:py-20">
        <h2 className="max-w-2xl text-balance text-[32px] font-bold leading-tight tracking-tight text-text-primary sm:text-[40px]">
          첫 글로벌 이모티콘을 만들어 보세요.
        </h2>
        <p className="mt-3 max-w-md text-[17px] leading-relaxed text-text-secondary">
          회원가입 없이 지금 바로 시작할 수 있습니다.
        </p>
        <Button
          size="lg"
          className="mt-8"
          onClick={() => navigate("/dashboard")}
        >
          무료로 시작하기
          <ArrowRight className="size-5" />
        </Button>
      </div>
    </section>
  )
}
