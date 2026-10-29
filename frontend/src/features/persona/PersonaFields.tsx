import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { useSiteLang } from '../../i18n/LanguageContext'
import { personaCopy } from '../../i18n/persona'
import { personaPayload, type PersonaDraft } from './persona'

const FIELDS = [
  { key: 'personality', label: 'personaPersonality', placeholder: 'personaPersonalityPlaceholder', maxLength: 80 },
  { key: 'speechStyle', label: 'personaSpeechStyle', placeholder: 'personaSpeechStylePlaceholder', maxLength: 80 },
  { key: 'age', label: 'personaAge', placeholder: 'personaAgePlaceholder', maxLength: 20 },
  { key: 'avoidExpressions', label: 'personaAvoid', placeholder: 'personaAvoidPlaceholder', maxLength: 330 },
] as const

export default function PersonaFields({ value, onChange, disabled }: { value: PersonaDraft; onChange: (next: PersonaDraft) => void; disabled?: boolean }) {
  const { lang } = useSiteLang()
  const copy = personaCopy(lang)
  const id = useId()
  // 선택 항목이라 기본은 접어 두고, 이미 적은 값이 있으면 펼친다.
  const [open, setOpen] = useState(() => personaPayload(value) !== null)

  return (
    <div className="mt-6 rounded-panel border border-gray-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold">{copy.personaTitle}</span>
          <span className="text-xs font-semibold text-sub">{copy.personaOptional}</span>
        </span>
        <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-sub transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={`${id}-panel`} className="border-t border-gray-100 px-5 pb-5 pt-4">
          <p className="text-sm font-medium text-sub">{copy.personaDesc}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {FIELDS.map(field => (
              <label key={field.key} className="block min-w-0">
                <span className="text-sm font-semibold text-ink">{copy[field.label]}</span>
                <input
                  value={value[field.key]}
                  onChange={event => onChange({ ...value, [field.key]: event.target.value })}
                  placeholder={copy[field.placeholder]}
                  maxLength={field.maxLength}
                  disabled={disabled}
                  className="mt-1.5 w-full rounded-control border border-gray-200 px-4 py-3 text-[15px] font-medium text-ink outline-none transition-colors focus:border-brand"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
