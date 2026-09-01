import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import { useSiteLang } from '../i18n/LanguageContext'

export default function NotFound() {
  const navigate = useNavigate()
  const { t } = useSiteLang()

  return (
    // 모바일 Safari는 100vh를 툴바가 숨겨진 높이로 계산해 실제 화면보다 커진다.
    // 내용이 한 화면에 들어오는 페이지라 svh를 써서 유령 스크롤을 없앤다.
    <div className="flex min-h-svh flex-col">
      <Header center={<NavMenu />} />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center sm:py-20">
        <p className="text-[80px] font-extrabold leading-none text-brand sm:text-[140px]">404</p>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.nfTitle}</h1>
          <p className="mt-2 font-medium text-sub">{t.nfDesc}</p>
        </div>
        <Button size="lg" glow onClick={() => navigate('/')}>
          {t.nfHome}
        </Button>
      </main>
    </div>
  )
}
