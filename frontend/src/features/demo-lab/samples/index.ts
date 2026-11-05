import type { DemoSample } from './types'
// Add only reviewed service captures. Development fixtures never enter production.
const captured: DemoSample[] = []
export const publishedSamples = captured.filter(sample => sample.rights.approved && sample.provenance.kind === 'service' && sample.provenance.record && sample.provenance.processedAt)
