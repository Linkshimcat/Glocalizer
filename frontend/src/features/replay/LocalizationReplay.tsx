import type { DemoSample } from '../demo-lab/samples/types'
interface Props { stages: DemoSample['stages']; labels: Record<DemoSample['stages'][number]['name'], string>; title: string; missing: string }
export default function LocalizationReplay({ stages, labels, title, missing }: Props) {
  return <section className="demo-panel"><h2>{title}</h2><ol className="demo-replay">
    {Object.entries(labels).map(([name, label]) => {
      const event = stages.find(stage => stage.name === name)
      return <li key={name}><strong>{label}</strong><span>{event?.occurredAt ? <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time> : missing}</span><span>{event?.durationMs !== undefined ? `${event.durationMs} ms` : missing}</span></li>
    })}
  </ol></section>
}
