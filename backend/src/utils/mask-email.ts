/** 메일을 보냈다고 알려줄 때 주소 앞부분을 가린다. me@example.com → m*@example.com */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`;
}
