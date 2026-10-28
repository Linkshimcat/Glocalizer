import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn();
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }));

process.env.SMTP_USER = 'sender@gmail.com';
process.env.SMTP_PASS = 'app-password';
process.env.FRONTEND_ORIGIN = 'https://glocalizer.vercel.app';

const { sendNewDeviceLoginEmail, sendOtherSessionsSignedOutEmail, sendPasswordChangedEmail } = await import('../../src/services/email.service.js');

const user = (patch: object = {}) => ({
  id: '00000000-0000-4000-8000-000000000001', email: 'user@example.com', security_email_notifications: true, ...patch,
}) as never;

// Braces matter: a function returned from beforeEach runs as teardown, and mockReset returns the mock.
beforeEach(() => {
  sendMail.mockReset();
  sendMail.mockResolvedValue({});
});

describe('security email gating', () => {
  it('sends every type by default, including rows without the per-type columns', async () => {
    await sendNewDeviceLoginEmail(user(), 'Chrome · macOS', '203.0.113.x');
    await sendPasswordChangedEmail(user());
    await sendOtherSessionsSignedOutEmail(user());
    expect(sendMail).toHaveBeenCalledTimes(3);
  });

  it('skips every type when the master switch is off', async () => {
    const off = user({ security_email_notifications: false });
    await sendNewDeviceLoginEmail(off, 'Chrome · macOS', '203.0.113.x');
    await sendPasswordChangedEmail(off);
    await sendOtherSessionsSignedOutEmail(off);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('skips only the type that was turned off', async () => {
    const muted = user({ security_email_password_changed: false });
    await sendPasswordChangedEmail(muted);
    expect(sendMail).not.toHaveBeenCalled();
    await sendNewDeviceLoginEmail(muted, null, null);
    await sendOtherSessionsSignedOutEmail(muted);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});
