import noteIcon from '../assets/LandingAssets/iconsax-note.svg'
import { useSiteLang } from '../i18n/LanguageContext'

const SPEC_GUIDE_URL =
  'https://veyrix.notion.site/Glocalizer-3ccac3df7c3980da892fd0d4eb55ca51?source=copy_link'

export default function UploadSpecBadge() {
  const { t } = useSiteLang()

  return (
    <a
      href={SPEC_GUIDE_URL}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-control border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-gray-300 hover:bg-surface dark:hover:border-gray-600"
    >
      <img src={noteIcon} alt="" aria-hidden className="h-3.5 w-3.5 shrink-0 dark:invert" />
      <span>{t.dashSpecNotice}</span>
    </a>
  )
}
