import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Footer from '../components/Footer'
import { useSiteLang } from '../i18n/LanguageContext'

export default function Pricing() {
  const navigate = useNavigate()
  const { t } = useSiteLang()

  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{t.pricingTitle}</h1>
        <p className="font-medium text-sub">{t.pricingDescription}</p>
        <Button size="lg" className="mt-3" onClick={() => navigate('/dashboard')}>
          {t.pricingWorkspaceCta}
        </Button>
      </main>
      <Footer />
    </div>
  )
}
