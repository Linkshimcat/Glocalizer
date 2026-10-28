import { describe, expect, it } from 'vitest';
import { renderNewDeviceLoginEmail, renderOtherSessionsSignedOutEmail, renderPasswordChangedEmail } from '../../src/emails/security-email.js';

describe('security email templates', () => {
  const siteUrl = 'https://glocalizer.vercel.app/';

  it('includes only safe new-device details and an account link', () => {
    const email = renderNewDeviceLoginEmail({ deviceLabel: 'Chrome · macOS', ipMasked: '203.0.113.x', siteUrl, occurredAt: new Date('2026-10-28T12:00:00Z') });
    expect(email.subject).toContain('새 브라우저');
    expect(email.html).toContain('Chrome · macOS');
    expect(email.text).toContain('203.0.113.x');
    expect(email.text).toContain('https://glocalizer.vercel.app/account');
    expect(email.text).not.toContain('203.0.113.42');
  });

  it('renders password and other-session notices as text alternatives', () => {
    for (const email of [renderPasswordChangedEmail({ siteUrl }), renderOtherSessionsSignedOutEmail({ siteUrl })]) {
      expect(email.html).toContain('<html lang="ko">');
      expect(email.text).toContain('계정 보안 설정');
      expect(email.text.length).toBeGreaterThan(50);
    }
  });
});
