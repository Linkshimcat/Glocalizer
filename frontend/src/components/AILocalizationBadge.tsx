import aiSparkle from '../assets/GCFrontendUI/iconsax-AISparkle.svg'
import { useSiteLang } from '../i18n/LanguageContext'

export default function AILocalizationBadge({ label }: { label?: string }) {
  const { t } = useSiteLang()

  return (
    <span
      className="inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-md bg-surface border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-ink"

    >
      <img src={aiSparkle} alt="" aria-hidden className="h-3.5 w-3.5 shrink-0" />
      <span>{label ?? t.dashAiNotice}</span>
    </span>
  )
}
