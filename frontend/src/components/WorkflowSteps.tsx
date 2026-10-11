import { useSiteLang } from '../i18n/LanguageContext'
import { experienceCopy } from '../i18n/experience'

export default function WorkflowSteps({ steps, current }: { steps: string[]; current: number }) {
  const { lang } = useSiteLang()
  return <ol className="workflow-steps" aria-label={experienceCopy[lang].steps}>
    {steps.map((step, index) => <li key={step} aria-current={index === current ? 'step' : undefined} data-complete={index < current}>
      <span aria-hidden="true">{index + 1}</span>{step}
    </li>)}
  </ol>
}
