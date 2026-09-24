import LegalDocument from '../components/LegalDocument'
import { useSiteLang } from '../i18n/LanguageContext'
import { legalDict } from '../i18n/legal'

export default function Terms() {
  const { lang } = useSiteLang()
  return <LegalDocument document={legalDict[lang].terms} />
}
