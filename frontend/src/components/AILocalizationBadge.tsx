import aiSparkle from '../assets/GCFrontendUI/iconsax-AISparkle.svg'
import { useSiteLang } from '../i18n/LanguageContext'

export default function AILocalizationBadge() {
  const { t } = useSiteLang()

  return (
    <span
      className="inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-full border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-ink"
      style={{
        background:
          'radial-gradient(circle at 5% 0%, rgba(228, 213, 228, 0.95) 0%, rgba(228, 213, 228, 0) 55%), radial-gradient(circle at 100% 100%, rgba(196, 224, 231, 0.95) 0%, rgba(196, 224, 231, 0) 55%), radial-gradient(circle at 55% 0%, rgba(244, 234, 224, 0.95) 0%, rgba(244, 234, 224, 0) 62%), #D0E7E6',
      }}
    >
      <img src={aiSparkle} alt="" aria-hidden className="h-3.5 w-3.5 shrink-0" />
      <span>{t.dashAiNotice}</span>
    </span>
  )
}
