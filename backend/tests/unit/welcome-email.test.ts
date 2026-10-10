import { describe, expect, it } from 'vitest';
import { renderWelcomeEmail } from '../../src/emails/welcome-email.js';

describe('renderWelcomeEmail', () => {
  it('greets the user by name and links into the site', () => {
    const email = renderWelcomeEmail({ name: '소연', siteUrl: 'https://glocalizer.vercel.app/' });
    expect(email.subject).toBe('Glocalizer에 오신 것을 환영합니다');
    expect(email.html).toContain('소연님, 환영합니다');
    expect(email.html).toContain('href="https://glocalizer.vercel.app/dashboard"');
    for (const path of ['/generate', '/localize', '/review', '/service', '/privacy']) {
      expect(email.html).toContain(`href="https://glocalizer.vercel.app${path}"`);
    }
    expect(email.text).toContain('워크스페이스 열기: https://glocalizer.vercel.app/dashboard');
    expect(email.text).not.toContain('<');
  });

  it('falls back to a generic greeting without a name', () => {
    for (const name of [null, '   ']) {
      expect(renderWelcomeEmail({ name, siteUrl: 'http://localhost:5173' }).html).toContain('Glocalizer에 오신 것을 환영합니다</h1>');
    }
  });

  it('escapes the name so it cannot inject markup', () => {
    const { html } = renderWelcomeEmail({ name: '<img src=x onerror=alert(1)>', siteUrl: 'http://localhost:5173' });
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;님, 환영합니다');
    expect(html).not.toContain('<img src=x');
  });
});
