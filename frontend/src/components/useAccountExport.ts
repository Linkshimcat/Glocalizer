export { useAccountExport } from '../store/AccountExportContext'

/** test@example.com → t***@example.com */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@')
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`
}
