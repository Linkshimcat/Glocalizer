import { Link } from 'react-router-dom'
import logoUrl from '../assets/GlocalizerLogo.png'

export default function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className="inline-flex w-fit items-center gap-2">
      <span
        className={`inline-block overflow-hidden ${small ? 'h-7 w-7' : 'h-9 w-9'}`}
      >
        {/* 원본 이미지의 마크 부분만 보이도록 확대·크롭 */}
        <img
          src={logoUrl}
          alt="Glocalizer 로고"
          className="h-full w-full scale-150 object-cover object-[50%_40%]"
        />
      </span>
      <span
        className={`font-extrabold tracking-tight text-ink ${small ? 'text-base' : 'text-xl'}`}
      >
        Glocalizer
      </span>
    </Link>
  )
}
