import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import { useSiteLang } from '../i18n/LanguageContext'

export default function NotFound() {
  const navigate = useNavigate()
  const { t } = useSiteLang()

  return (
    <div className="flex min-h-screen flex-col">
      <Header center={<NavMenu />} sticky />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
        <p className="text-[96px] font-extrabold leading-none text-brand sm:text-[140px]">404</p>
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
