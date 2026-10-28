import { useState } from 'react'
import { accountCopy } from '../i18n/account'
import { useSiteLang } from '../i18n/LanguageContext'
import { loadDefaultTargetLangCodes, saveDefaultTargetLangCodes } from '../lib/defaultLanguages'
import { LANGUAGES } from '../store/uploads'

/** 새 작업에서 미리 선택해 둘 번역 언어. 이 브라우저에만 저장한다. */
export default function DefaultTargetLanguages() {
  const { lang } = useSiteLang()
  const t = accountCopy(lang)
  const [codes, setCodes] = useState(loadDefaultTargetLangCodes)

  const toggle = (code: string) => {
    const next = codes.includes(code) ? codes.filter(item => item !== code) : [...codes, code]
    setCodes(next)
    saveDefaultTargetLangCodes(next)
  }

  return (
    <div className="border-b border-line py-5">
      <h2 className="text-lg font-extrabold text-ink">{t.accountDefaultLangsTitle}</h2>
      <p className="mt-1 text-sm text-sub">{t.accountDefaultLangsDesc}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {LANGUAGES.map(language => {
          const selected = codes.includes(language.code)
          return (
            <button
              key={language.code}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(language.code)}
              className={`flex min-h-11 items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors ${selected ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-ink hover:border-gray-200'}`}
            >
              <span aria-hidden="true">{language.flag}</span>
              {language.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
